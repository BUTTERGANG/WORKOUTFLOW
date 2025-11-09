# Messaging Feature Implementation Plan

## 📋 Current Status

### ✅ What Already Exists

**Database Schema:**
- `messages` table with sender, recipient, content, timestamps
- Proper indexes on sender_id, recipient_id, created_at
- Support for workout-specific comments (workoutSessionId)

**Server Routes:**
- `POST /api/messages` - Send a message
- `GET /api/messages/conversation/:otherUserId` - Get conversation
- `PATCH /api/messages/:id/read` - Mark message as read

**Storage Functions:**
- `createMessage()` - Insert new message
- `getConversation()` - Get messages between two users
- `markMessageAsRead()` - Update readAt timestamp

**Client UI:**
- Messages page skeleton at `client/src/pages/messages.tsx`
- UI templates already coded (currently hidden)
- Message input, scroll area, send button

### ❌ What's Missing

1. **Contact List** - No way to see who you can message
2. **Coach Discovery** - Athletes can't find their coaches
3. **Conversation List** - No list of active conversations
4. **Unread Counts** - No notification badges
5. **Real-time Updates** - Messages don't auto-refresh
6. **Authorization** - No checks on who can message who

---

## 🎯 Phase 1: Core Athlete-to-Coach Messaging

### Feature 1: Get Organization Coaches (Server-Side)

**File:** Create new endpoint in `server/routes.ts`

**Add after line 1650 (after message routes):**

```typescript
// Get all coaches in an athlete's organizations
app.get('/api/messages/contacts', isAuthenticated, async (req: AuthRequest, res) => {
  try {
    const userId = req.currentUser!.id;
    const userRole = req.currentUser!.role;

    let contacts: (User & { organizationName?: string })[] = [];

    if (userRole === 'athlete') {
      // For athletes: Get all coaches from their organizations
      const userOrgs = await storage.getUserOrganizations(userId);

      const allCoaches = await Promise.all(
        userOrgs.map(async (org) => {
          const members = await storage.getOrganizationMembers(org.id);

          // Filter to only coaches (admin, head_coach, assistant_coach)
          const coaches = members
            .filter(m => ['admin', 'head_coach', 'assistant_coach'].includes(m.user.role))
            .map(m => ({
              ...m.user,
              organizationName: org.name,
            }));

          return coaches;
        })
      );

      // Flatten and deduplicate by userId
      const coachMap = new Map();
      allCoaches.flat().forEach(coach => {
        if (!coachMap.has(coach.id)) {
          coachMap.set(coach.id, coach);
        }
      });

      contacts = Array.from(coachMap.values());
    } else {
      // For coaches: Get all athletes from their organizations
      const userOrgs = await storage.getUserOrganizations(userId);

      const allAthletes = await Promise.all(
        userOrgs.map(async (org) => {
          const members = await storage.getOrganizationMembers(org.id);

          // Filter to only athletes
          const athletes = members
            .filter(m => m.user.role === 'athlete')
            .map(m => ({
              ...m.user,
              organizationName: org.name,
            }));

          return athletes;
        })
      );

      // Flatten and deduplicate
      const athleteMap = new Map();
      allAthletes.flat().forEach(athlete => {
        if (!athleteMap.has(athlete.id)) {
          athleteMap.set(athlete.id, athlete);
        }
      });

      contacts = Array.from(athleteMap.values());
    }

    res.json(contacts);
  } catch (error) {
    console.error("Error fetching contacts:", error);
    res.status(500).json({ message: "Failed to fetch contacts" });
  }
});

// Get conversation list with last message and unread count
app.get('/api/messages/conversations', isAuthenticated, async (req: AuthRequest, res) => {
  try {
    const userId = req.currentUser!.id;

    // Get all messages where user is sender or recipient
    const userMessages = await db
      .select()
      .from(messages)
      .where(
        sql`${messages.senderId} = ${userId} OR ${messages.recipientId} = ${userId}`
      )
      .orderBy(desc(messages.createdAt));

    // Group by conversation partner
    const conversationMap = new Map<string, {
      partnerId: string;
      lastMessage: Message;
      unreadCount: number;
    }>();

    for (const message of userMessages) {
      const partnerId = message.senderId === userId ? message.recipientId : message.senderId;

      if (!conversationMap.has(partnerId)) {
        // Count unread messages from this partner
        const unreadCount = userMessages.filter(
          m => m.senderId === partnerId &&
               m.recipientId === userId &&
               !m.readAt
        ).length;

        conversationMap.set(partnerId, {
          partnerId,
          lastMessage: message,
          unreadCount,
        });
      }
    }

    // Fetch user details for each conversation
    const conversations = await Promise.all(
      Array.from(conversationMap.values()).map(async (conv) => {
        const partner = await storage.getUser(conv.partnerId);
        return {
          partner,
          lastMessage: conv.lastMessage,
          unreadCount: conv.unreadCount,
        };
      })
    );

    // Sort by last message time
    conversations.sort((a, b) =>
      new Date(b.lastMessage.createdAt).getTime() -
      new Date(a.lastMessage.createdAt).getTime()
    );

    res.json(conversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ message: "Failed to fetch conversations" });
  }
});

// Get unread message count
app.get('/api/messages/unread-count', isAuthenticated, async (req: AuthRequest, res) => {
  try {
    const userId = req.currentUser!.id;

    const unreadMessages = await db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(
        and(
          eq(messages.recipientId, userId),
          sql`${messages.readAt} IS NULL`
        )
      );

    res.json({ count: unreadMessages[0]?.count || 0 });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({ message: "Failed to fetch unread count" });
  }
});
```

**Add required imports at the top of routes.ts:**
```typescript
import { desc, and, sql } from "drizzle-orm";
```

---

### Feature 2: Authorization Middleware

**File:** `server/routes.ts`

**Update the POST /api/messages route (line 1621) to include authorization:**

```typescript
app.post('/api/messages', isAuthenticated, async (req: AuthRequest, res) => {
  try {
    const userId = req.currentUser!.id;
    const data = insertMessageSchema.parse({ ...req.body, senderId: userId });

    // AUTHORIZATION: Check if sender and recipient are in the same organization
    const senderOrgs = await storage.getUserOrganizations(userId);
    const recipientOrgs = await storage.getUserOrganizations(data.recipientId);

    const senderOrgIds = senderOrgs.map(o => o.id);
    const recipientOrgIds = recipientOrgs.map(o => o.id);

    const hasSharedOrg = senderOrgIds.some(id => recipientOrgIds.includes(id));

    if (!hasSharedOrg) {
      return res.status(403).json({
        message: "Forbidden: You can only message people in your organization"
      });
    }

    const message = await storage.createMessage(data);
    res.json(message);
  } catch (error) {
    console.error("Error creating message:", error);
    res.status(400).json({ message: "Failed to create message" });
  }
});
```

---

### Feature 3: Complete Messages Page UI

**File:** `client/src/pages/messages.tsx`

**Replace the entire file with:**

```typescript
import { useEffect, useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send, Users as UsersIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { User, Message } from "@shared/schema";
import { cn } from "@/lib/utils";

interface Contact extends User {
  organizationName?: string;
}

interface Conversation {
  partner: User;
  lastMessage: Message;
  unreadCount: number;
}

export default function Messages() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [messageText, setMessageText] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch contacts (coaches for athletes, athletes for coaches)
  const { data: contacts } = useQuery<Contact[]>({
    queryKey: ['/api/messages/contacts'],
    enabled: isAuthenticated && !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch conversation list
  const { data: conversations } = useQuery<Conversation[]>({
    queryKey: ['/api/messages/conversations'],
    enabled: isAuthenticated && !!user,
    refetchInterval: 10000, // Refetch every 10 seconds for new messages
  });

  // Fetch messages for selected contact
  const { data: messages, refetch: refetchMessages } = useQuery<Message[]>({
    queryKey: ['/api/messages/conversation', selectedContact?.id],
    enabled: !!selectedContact,
    queryFn: async () => {
      const res = await fetch(`/api/messages/conversation/${selectedContact!.id}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch messages');
      return res.json();
    },
    refetchInterval: 3000, // Poll for new messages every 3 seconds
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { recipientId: string; content: string }) => {
      return await apiRequest('/api/messages', {
        method: 'POST',
        body: data,
      });
    },
    onSuccess: () => {
      setMessageText("");
      refetchMessages();
      queryClient.invalidateQueries({ queryKey: ['/api/messages/conversations'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Mark messages as read when viewing conversation
  useEffect(() => {
    if (messages && selectedContact) {
      const unreadMessages = messages.filter(
        m => m.recipientId === user?.id && !m.readAt
      );

      unreadMessages.forEach(async (message) => {
        try {
          await fetch(`/api/messages/${message.id}/read`, {
            method: 'PATCH',
            credentials: 'include',
          });
        } catch (error) {
          console.error('Failed to mark message as read:', error);
        }
      });

      if (unreadMessages.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['/api/messages/conversations'] });
      }
    }
  }, [messages, selectedContact, user?.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedContact) return;

    sendMessageMutation.mutate({
      recipientId: selectedContact.id,
      content: messageText.trim(),
    });
  };

  const getUserInitials = (u: User) => {
    if (u.firstName && u.lastName) {
      return `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();
    }
    return u.email?.[0]?.toUpperCase() || '?';
  };

  const getUserName = (u: User) => {
    if (u.firstName && u.lastName) {
      return `${u.firstName} ${u.lastName}`;
    }
    return u.email?.split('@')[0] || 'User';
  };

  const formatMessageTime = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Contacts/Conversations Sidebar */}
      <div className="w-80 border-r border-border bg-muted/10">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Messages</h2>
          <p className="text-sm text-muted-foreground">
            {user.role === 'athlete' ? 'Your Coaches' : 'Your Athletes'}
          </p>
        </div>

        <ScrollArea className="h-[calc(100vh-10rem)]">
          {/* Recent Conversations */}
          {conversations && conversations.length > 0 && (
            <div className="p-2">
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase">
                Recent
              </p>
              {conversations.map((conv) => (
                <button
                  key={conv.partner.id}
                  onClick={() => setSelectedContact(conv.partner)}
                  className={cn(
                    "w-full flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left",
                    selectedContact?.id === conv.partner.id && "bg-muted"
                  )}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={conv.partner.profileImageUrl || undefined} />
                    <AvatarFallback>{getUserInitials(conv.partner)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium truncate">{getUserName(conv.partner)}</p>
                      {conv.unreadCount > 0 && (
                        <Badge variant="default" className="h-5 min-w-5 px-1.5 text-xs">
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {conv.lastMessage.content}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatMessageTime(conv.lastMessage.createdAt)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* All Contacts */}
          {contacts && contacts.length > 0 && (
            <div className="p-2 mt-4">
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase">
                All {user.role === 'athlete' ? 'Coaches' : 'Athletes'}
              </p>
              {contacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors",
                    selectedContact?.id === contact.id && "bg-muted"
                  )}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={contact.profileImageUrl || undefined} />
                    <AvatarFallback>{getUserInitials(contact)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="font-medium">{getUserName(contact)}</p>
                    {contact.organizationName && (
                      <p className="text-xs text-muted-foreground">{contact.organizationName}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Empty State */}
          {(!contacts || contacts.length === 0) && (!conversations || conversations.length === 0) && (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <UsersIcon className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                No contacts available.
                {user.role === 'athlete'
                  ? ' Join an organization to message coaches.'
                  : ' Athletes in your organization will appear here.'}
              </p>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col">
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border bg-background">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedContact.profileImageUrl || undefined} />
                  <AvatarFallback>{getUserInitials(selectedContact)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{getUserName(selectedContact)}</p>
                  <p className="text-sm text-muted-foreground capitalize">{selectedContact.role.replace('_', ' ')}</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              {messages && messages.length > 0 ? (
                <div className="space-y-4">
                  {messages.map((message) => {
                    const isOwn = message.senderId === user.id;
                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "flex gap-3",
                          isOwn && "flex-row-reverse"
                        )}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={isOwn
                              ? user.profileImageUrl || undefined
                              : selectedContact.profileImageUrl || undefined
                            }
                          />
                          <AvatarFallback>
                            {isOwn ? getUserInitials(user) : getUserInitials(selectedContact)}
                          </AvatarFallback>
                        </Avatar>
                        <div className={cn("flex-1", isOwn && "text-right")}>
                          <div
                            className={cn(
                              "inline-block max-w-prose rounded-lg p-3",
                              isOwn
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            )}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatMessageTime(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No messages yet. Start the conversation!
                  </p>
                </div>
              )}
            </ScrollArea>

            {/* Message Input */}
            <div className="border-t border-border p-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1"
                  data-testid="input-message"
                  disabled={sendMessageMutation.isPending}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || sendMessageMutation.isPending}
                  data-testid="button-send-message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <MessageSquare className="h-20 w-20 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Select a conversation</h3>
            <p className="text-muted-foreground max-w-sm">
              Choose a {user.role === 'athlete' ? 'coach' : 'athlete'} from the sidebar to start messaging
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

### Feature 4: Add Unread Badge to Sidebar

**File:** `client/src/components/app-sidebar.tsx`

**Add after line 36:**

```typescript
import { useQuery } from "@tanstack/react-query";
```

**Add inside the AppSidebar component (after line 40):**

```typescript
// Fetch unread message count
const { data: unreadData } = useQuery<{ count: number }>({
  queryKey: ['/api/messages/unread-count'],
  enabled: !!user,
  refetchInterval: 10000, // Check every 10 seconds
});
```

**Update the Messages nav item (around line 73-78):**

```typescript
{
  title: "Messages",
  url: "/messages",
  icon: MessageSquare,
  roles: ['admin', 'head_coach', 'assistant_coach', 'athlete'],
  badge: unreadData?.count && unreadData.count > 0 ? unreadData.count : undefined,
},
```

**Update the nav items rendering (around line 120-145) to show badge:**

```typescript
{visibleItems.map((item) => (
  <SidebarMenuItem key={item.title}>
    <SidebarMenuButton
      asChild
      isActive={location === item.url}
      onClick={() => window.location.href = item.url}
    >
      <a href={item.url}>
        <item.icon />
        <span>{item.title}</span>
        {item.badge && (
          <Badge variant="default" className="ml-auto h-5 min-w-5 px-1.5">
            {item.badge}
          </Badge>
        )}
      </a>
    </SidebarMenuButton>
  </SidebarMenuItem>
))}
```

---

## 🧪 Testing Steps

### Test 1: Athlete Messages Coach
1. Login as an athlete
2. Go to Messages page
3. Should see coaches from your organization in the sidebar
4. Click on a coach
5. Send a message
6. Message should appear in chat area

### Test 2: Coach Receives Message
1. Login as the coach
2. Go to Messages page
3. Should see unread badge on sidebar (if athlete sent message)
4. Should see athlete's conversation in "Recent"
5. Click on athlete
6. Should see the message from athlete
7. Reply to athlete

### Test 3: Real-time Updates
1. Keep both accounts open in different browsers
2. Send messages back and forth
3. Messages should appear within 3 seconds
4. Unread counts should update within 10 seconds

### Test 4: Authorization
1. Try to send message to user NOT in your organization
2. Should get 403 Forbidden error

---

## 📊 Database Optimization

**File:** `shared/schema.ts`

**Add composite index for better query performance (after line 303):**

```typescript
index("idx_messages_conversation").on(table.senderId, table.recipientId, table.createdAt),
unique("idx_messages_unread").on(table.recipientId, table.readAt),
```

**Run migration:**
```bash
npm run db:push
```

---

## 🚀 Phase 2: Future Enhancements (Not Implemented Yet)

### Group Messaging
- Add `conversationType` enum ('direct', 'group')
- Add `conversationId` to messages
- Create `conversations` table with members
- Update UI to show group chats

### Real-time with WebSockets
- Replace polling with socket.io
- Instant message delivery
- Typing indicators
- Online status

### Rich Features
- File attachments
- Image sharing
- Emoji reactions
- Message editing/deletion
- Search conversations

### Notifications
- Push notifications (web push API)
- Email notifications for offline users
- In-app notification center

---

## 📝 Summary

**What You'll Have After Implementation:**

✅ Athletes can see all coaches in their organizations
✅ Coaches can see all athletes in their organizations
✅ Direct 1-on-1 messaging between athletes and coaches
✅ Real-time-ish updates (3-second polling)
✅ Unread message counts and badges
✅ Conversation history
✅ Authorization (only message people in your org)
✅ Clean, modern UI with recent conversations
✅ Auto-scroll to new messages
✅ Mark as read functionality

**Estimated Implementation Time:** 2-3 hours

**Files to Modify:**
1. `server/routes.ts` - Add 3 new endpoints + update authorization
2. `client/src/pages/messages.tsx` - Complete rewrite with full functionality
3. `client/src/components/app-sidebar.tsx` - Add unread badge
4. `shared/schema.ts` - Add indexes (optional but recommended)

---

**Document Created:** 2025-11-08
**Feature:** Athlete-to-Coach Messaging (Phase 1)
**Status:** Ready for Implementation
