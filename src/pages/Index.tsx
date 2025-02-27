
import { ChatAssistant } from "@/components/ChatAssistant";

const Index = () => {
  const handleContactSupport = () => {
    console.log("Contacting human support...");
  };

  const handleNewSession = (sessionId: string) => {
    console.log("New chat session started:", sessionId);
  };

  // Example auth and metadata configuration
  const authConfig = {
    type: 'jwt' as const,
    token: 'example-jwt-token'
  };

  const userMetadata = {
    plan: 'pro',
    company: 'Acme Inc',
    preferredLanguage: 'en'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h1 className="text-4xl font-bold text-gray-900">Welcome to Your App</h1>
          <p className="text-xl text-gray-600">
            Click the chat button in the bottom right corner to start a conversation.
          </p>
        </div>
      </div>

      <ChatAssistant
        userId="demo-user"
        userMetadata={userMetadata}
        auth={authConfig}
        apiEndpoint="/api/chat" // In real implementation
        onContactSupport={handleContactSupport}
        onNewSession={handleNewSession}
        theme={{
          primary: '#007AFF',
          secondary: '#E5E7EB',
          background: '#FFFFFF',
          text: '#1F2937',
        }}
      />
    </div>
  );
};

export default Index;
