import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Messages() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [messageText, setMessageText] = useState("");

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
    if (!messageText.trim()) return;
    
    toast({
      title: "Message sent",
      description: "Your message has been delivered.",
    });
    setMessageText("");
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground">Messages</h1>
            <p className="mt-2 text-muted-foreground">
              Communicate with your {user.role === 'athlete' ? 'coaches' : 'athletes'}
            </p>
          </div>

          {/* Messages Container */}
          <Card className="flex h-[calc(100vh-16rem)] flex-col">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-lg">Conversation</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col p-0">
              {/* Messages Area */}
              <ScrollArea className="flex-1 p-4">
                <div className="flex flex-col items-center justify-center py-12">
                  <MessageSquare className="mb-4 h-16 w-16 text-muted-foreground" />
                  <h3 className="mb-2 text-xl font-semibold">No messages yet</h3>
                  <p className="text-center text-muted-foreground">
                    Start a conversation by sending a message
                  </p>
                </div>

                {/* Sample Message - Hidden for now */}
                <div className="hidden space-y-4">
                  {/* Coach Message (left) */}
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="" style={{ objectFit: 'cover' }} />
                      <AvatarFallback>C</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="max-w-prose rounded-lg bg-muted p-3">
                        <p className="text-sm">Great work on your squat session today! Keep it up.</p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">Coach • 2 hours ago</p>
                    </div>
                  </div>

                  {/* Athlete Message (right) */}
                  <div className="flex flex-row-reverse gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="" style={{ objectFit: 'cover' }} />
                      <AvatarFallback>A</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="ml-auto max-w-prose rounded-lg bg-primary p-3 text-primary-foreground">
                        <p className="text-sm">Thanks! Felt really strong today.</p>
                      </div>
                      <p className="mt-1 text-right text-xs text-muted-foreground">You • 1 hour ago</p>
                    </div>
                  </div>
                </div>
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
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageText.trim()}
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
  );
}
