import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User as UserType, Message, OrganizationMember } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

export default function Messages() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [messageText, setMessageText] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Fetch user's organizations
  const { data: organizations = [] } = useQuery<any[]>({
    queryKey: ['/api/organizations/my'],
    enabled: !!user,
  });

  // Get first organization's members
  const firstOrgId = organizations[0]?.id;
  const { data: members = [], isLoading: membersLoading } = useQuery<(OrganizationMember & { user: UserType })[]>({
    queryKey: ['/api/organizations', firstOrgId, 'members'],
    enabled: !!firstOrgId,
  });

  // Filter out current user from members list
  const otherUsers = members.filter(m => m.userId !== user?.id);

  // Fetch conversation with selected user
  const { data: messages = [], isLoading: messagesLoading, refetch: refetchMessages } = useQuery<Message[]>({
    queryKey: ['/api/messages', selectedUserId],
    enabled: !!selectedUserId,
    refetchInterval: 5000, // Refetch every 5 seconds for new messages
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { recipientId: string; content: string }) =>
      apiRequest('/api/messages', { method: 'POST', body: data }),
    onSuccess: () => {
      setMessageText("");
      refetchMessages();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

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

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedUserId) return;
    
    sendMessageMutation.mutate({
      recipientId: selectedUserId,
      content: messageText,
    });
  };

  const selectedUser = otherUsers.find(m => m.userId === selectedUserId)?.user;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground">Messages</h1>
            <p className="mt-2 text-muted-foreground">
              Communicate with your {user.role === 'athlete' ? 'coaches' : 'athletes'}
            </p>
          </div>

          {/* Messages Container with Two-Column Layout */}
          <div className="grid h-[500px] lg:h-[calc(100vh-16rem)] grid-cols-1 gap-4 lg:grid-cols-3">
            {/* User List */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">People</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px] lg:h-[calc(100vh-20rem)]">
                  {membersLoading ? (
                    <div className="p-4 text-center text-muted-foreground">Loading...</div>
                  ) : otherUsers.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      <User className="mx-auto mb-2 h-8 w-8" />
                      <p className="text-sm">No team members yet</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {otherUsers.map((member) => (
                        <button
                          key={member.userId}
                          onClick={() => setSelectedUserId(member.userId)}
                          className={`flex w-full items-center gap-3 p-4 text-left transition-colors hover-elevate active-elevate-2 ${
                            selectedUserId === member.userId ? 'bg-accent' : ''
                          }`}
                          data-testid={`button-select-user-${member.userId}`}
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              {member.user.firstName?.[0]}{member.user.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 overflow-hidden">
                            <p className="truncate font-medium">
                              {member.user.firstName} {member.user.lastName}
                            </p>
                            <p className="truncate text-sm text-muted-foreground">
                              {member.role === 'athlete' ? 'Athlete' : 'Coach'}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Conversation */}
            <Card className="flex flex-col lg:col-span-2">
              <CardHeader className="border-b border-border">
                <CardTitle className="text-lg flex items-center gap-2">
                  {selectedUser ? (
                    <>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {selectedUser.firstName?.[0]}{selectedUser.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span>{selectedUser.firstName} {selectedUser.lastName}</span>
                    </>
                  ) : (
                    'Select a conversation'
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col p-0">
                {/* Messages Area */}
                <ScrollArea className="flex-1 p-4">
                  {!selectedUserId ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <MessageSquare className="mb-4 h-16 w-16 text-muted-foreground" />
                      <h3 className="mb-2 text-xl font-semibold">Select a conversation</h3>
                      <p className="text-center text-muted-foreground max-w-sm">
                        Choose a team member from the list to start messaging
                      </p>
                    </div>
                  ) : messagesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                        <p className="text-muted-foreground">Loading messages...</p>
                      </div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground" />
                      <p className="text-center text-muted-foreground">
                        No messages yet. Start the conversation!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => {
                        const isCurrentUser = message.senderId === user.id;
                        const sender = isCurrentUser ? user : selectedUser;

                        return (
                          <div
                            key={message.id}
                            className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}
                            data-testid={`message-${message.id}`}
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {sender?.firstName?.[0]}{sender?.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div
                                className={`max-w-prose rounded-lg p-3 ${
                                  isCurrentUser
                                    ? 'ml-auto bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                }`}
                              >
                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                              </div>
                              <p
                                className={`mt-1 text-xs text-muted-foreground ${
                                  isCurrentUser ? 'text-right' : ''
                                }`}
                              >
                                {isCurrentUser ? 'You' : `${sender?.firstName}`} •{' '}
                                {message.createdAt && formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>

                {/* Message Input */}
                <div className="border-t border-border p-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder={selectedUserId ? "Type a message..." : "Select a user first..."}
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
                      disabled={!selectedUserId || sendMessageMutation.isPending}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!messageText.trim() || !selectedUserId || sendMessageMutation.isPending}
                      data-testid="button-send-message"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
