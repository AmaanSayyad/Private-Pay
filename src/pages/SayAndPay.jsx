import { useState, useRef, useEffect } from "react";
import { Button, Input, Card, CardBody, Spinner, Chip } from "@nextui-org/react";
import { Send, Bot, User, Sparkles, Shield, Zap, Key, Settings } from "lucide-react";
import { useZcash } from "../providers/ZcashProvider";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { cnm } from "../utils/style";
import PrivacyNavbar from "../components/shared/PrivacyNavbar";

// NEAR AI Cloud configuration
const NEAR_AI_BASE_URL = "https://cloud-api.near.ai/v1";

// Example prompts for users
const EXAMPLE_PROMPTS = [
    "Send 5 ZEC to alice privately",
    "What's my current ZEC balance?",
    "Donate 2 ZEC to privacy advocacy",
    "Swap 10 ZEC to SOL",
    "Help me set up recurring payments",
];

// Message component
const ChatMessage = ({ message, isUser }) => (
    <div className={cnm("flex gap-3 w-full", isUser ? "justify-end" : "justify-start")}>
        <div className={cnm(
            "flex gap-3 max-w-[80%]",
            isUser ? "flex-row-reverse" : "flex-row"
        )}>
            <div className={cnm(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                isUser ? "bg-primary text-white" : "bg-gradient-to-br from-yellow-400 to-amber-500 text-white"
            )}>
                {isUser ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className={cnm(
                "px-4 py-3 rounded-2xl",
                isUser
                    ? "bg-primary text-white rounded-tr-sm"
                    : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm"
            )}>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                {message.action && (
                    <div className="mt-2 pt-2 border-t border-white/20">
                        <Chip size="sm" color="warning" variant="flat">
                            Action: {message.action}
                        </Chip>
                    </div>
                )}
            </div>
        </div>
    </div>
);

// Typing indicator
const TypingIndicator = () => (
    <div className="flex gap-3 w-full justify-start">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
            <Bot size={16} className="text-white" />
        </div>
        <div className="px-4 py-3 rounded-2xl bg-white border border-gray-200 rounded-tl-sm">
            <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
        </div>
    </div>
);

export default function SayAndPay() {
    const navigate = useNavigate();
    const { zcashAccount, isConnected, balance, simulateDeposit } = useZcash();
    const [messages, setMessages] = useState([
        {
            id: 1,
            content: "Hello! I'm your private ZEC assistant powered by NEAR AI. I run in a Trusted Execution Environment (TEE), so your prompts and financial data stay completely private. How can I help you today?",
            isUser: false,
        }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [apiKey, setApiKey] = useState(localStorage.getItem("near_ai_key") || "");
    const [showApiKeyInput, setShowApiKeyInput] = useState(!localStorage.getItem("near_ai_key"));
    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Save API key
    const saveApiKey = () => {
        if (apiKey.trim()) {
            localStorage.setItem("near_ai_key", apiKey.trim());
            setShowApiKeyInput(false);
            toast.success("API key saved!");
        }
    };

    // Change/Clear API key
    const changeApiKey = () => {
        setShowApiKeyInput(true);
        toast("Enter a new API key", { icon: "🔑" });
    };

    // Clear API key completely
    const clearApiKey = () => {
        localStorage.removeItem("near_ai_key");
        setApiKey("");
        setShowApiKeyInput(true);
        toast.success("API key cleared!");
    };

    // Parse AI response for actions
    const parseActionFromResponse = (response) => {
        const lowerResponse = response.toLowerCase();

        if (lowerResponse.includes("send") && lowerResponse.includes("zec")) {
            return { action: "send_zec", description: "Send ZEC" };
        }
        if (lowerResponse.includes("swap")) {
            return { action: "swap", description: "Swap tokens" };
        }
        if (lowerResponse.includes("donate")) {
            return { action: "donate", description: "Donate ZEC" };
        }
        if (lowerResponse.includes("balance")) {
            return { action: "check_balance", description: "Check balance" };
        }
        return null;
    };

    // Send message to NEAR AI
    const sendMessage = async () => {
        if (!input.trim()) return;

        if (!apiKey) {
            setShowApiKeyInput(true);
            toast.error("Please enter your NEAR AI API key first");
            return;
        }

        const userMessage = {
            id: Date.now(),
            content: input.trim(),
            isUser: true,
        };

        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            // Build context with user's ZEC info
            const systemPrompt = `You are a private ZEC (Zcash) payment assistant running in a Trusted Execution Environment (TEE) on NEAR AI Cloud. Your responses are cryptographically verified and completely private.

Current user context:
- Wallet connected: ${isConnected ? "Yes" : "No"}
- ZEC Balance: ${isConnected ? balance.available : "Not connected"} tZEC
- Wallet Address: ${isConnected ? zcashAccount?.address : "Not available"}

You can help users with:
1. Sending ZEC privately via shielded transactions
2. Checking their balance
3. Donating to causes (find relevant charities)
4. Swapping ZEC to other tokens via NEAR Intents
5. Setting up recurring payments
6. Cross-chain payments using ZEC

Always be helpful, concise, and remind users that their data is protected by TEE encryption. If they want to execute a transaction, confirm the details first.`;

            const response = await fetch(`${NEAR_AI_BASE_URL}/chat/completions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: "zai-org/GLM-4.6", // Best for agentic use
                    messages: [
                        { role: "system", content: systemPrompt },
                        ...messages.slice(-10).map(m => ({
                            role: m.isUser ? "user" : "assistant",
                            content: m.content
                        })),
                        { role: "user", content: input.trim() }
                    ],
                    max_tokens: 1024,
                    temperature: 0.7,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `API error: ${response.status}`);
            }

            const data = await response.json();
            const assistantContent = data.choices?.[0]?.message?.content || "I apologize, I couldn't process that request.";

            // Parse for any actions
            const actionInfo = parseActionFromResponse(assistantContent);

            const assistantMessage = {
                id: Date.now() + 1,
                content: assistantContent,
                isUser: false,
                action: actionInfo?.description,
            };

            setMessages(prev => [...prev, assistantMessage]);

            // Handle specific actions
            if (actionInfo?.action === "check_balance" && isConnected) {
                toast.success(`Current balance: ${balance.available} tZEC`);
            }

        } catch (error) {
            console.error("NEAR AI Error:", error);

            let errorMessage = "I encountered an error connecting to NEAR AI Cloud. ";
            if (error.message.includes("401") || error.message.includes("unauthorized")) {
                errorMessage += "Please check your API key.";
                setShowApiKeyInput(true);
            } else if (error.message.includes("429")) {
                errorMessage += "Rate limit exceeded. Please try again in a moment.";
            } else {
                errorMessage += error.message;
            }

            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                content: errorMessage,
                isUser: false,
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle Enter key
    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // Use example prompt
    const useExample = (prompt) => {
        setInput(prompt);
    };

    return (
        <div className="flex flex-col min-h-screen w-full">
            <PrivacyNavbar />

            {/* Header */}
            <div className="flex flex-col items-center pt-6 pb-4 px-4">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
                        <Sparkles className="text-white" size={20} />
                    </div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-500 to-amber-600 bg-clip-text text-transparent">
                        Say & Pay
                    </h1>
                </div>
                <p className="text-sm text-gray-500 text-center max-w-md">
                    Private AI-powered ZEC transactions via NEAR AI Cloud
                </p>

                {/* Security badges */}
                <div className="flex gap-2 mt-3 flex-wrap justify-center">
                    <Chip size="sm" variant="flat" color="success" startContent={<Shield size={12} />}>
                        TEE Protected
                    </Chip>
                    <Chip size="sm" variant="flat" color="warning" startContent={<Zap size={12} />}>
                        NEAR AI
                    </Chip>
                    {/* API Key status & change button */}
                    {apiKey && !showApiKeyInput && (
                        <Chip
                            size="sm"
                            variant="flat"
                            color="secondary"
                            startContent={<Key size={12} />}
                            endContent={
                                <button
                                    onClick={changeApiKey}
                                    className="ml-1 hover:bg-secondary/20 rounded-full p-0.5"
                                >
                                    <Settings size={10} />
                                </button>
                            }
                            className="cursor-pointer"
                            onClick={changeApiKey}
                        >
                            API Key Set
                        </Chip>
                    )}
                </div>
            </div>

            {/* API Key Input (if needed) */}
            {showApiKeyInput && (
                <div className="px-4 pb-4 max-w-2xl mx-auto w-full">
                    <Card className="bg-amber-50 border-amber-200">
                        <CardBody className="gap-3">
                            <div className="flex justify-between items-start">
                                <p className="text-sm text-amber-800">
                                    Enter your NEAR AI Cloud API key to enable private AI inference.
                                    Get one at <a href="https://cloud.near.ai" target="_blank" rel="noopener noreferrer" className="underline font-medium">cloud.near.ai</a>
                                </p>
                                {localStorage.getItem("near_ai_key") && (
                                    <Button
                                        size="sm"
                                        variant="light"
                                        className="text-amber-700 min-w-0 px-2"
                                        onClick={() => {
                                            setApiKey(localStorage.getItem("near_ai_key") || "");
                                            setShowApiKeyInput(false);
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    type="password"
                                    placeholder="Enter NEAR AI API key..."
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    size="sm"
                                    classNames={{
                                        inputWrapper: "bg-white"
                                    }}
                                />
                                <Button color="warning" size="sm" onClick={saveApiKey}>
                                    Save
                                </Button>
                                {localStorage.getItem("near_ai_key") && (
                                    <Button
                                        color="danger"
                                        variant="flat"
                                        size="sm"
                                        onClick={clearApiKey}
                                    >
                                        Clear
                                    </Button>
                                )}
                            </div>
                        </CardBody>
                    </Card>
                </div>
            )}

            {/* Wallet Status */}
            {!isConnected && (
                <div className="px-4 pb-4 max-w-2xl mx-auto w-full">
                    <Card className="bg-blue-50 border-blue-200">
                        <CardBody className="flex-row items-center justify-between">
                            <p className="text-sm text-blue-800">
                                Connect your Zcash wallet to enable transactions
                            </p>
                            <Button
                                color="primary"
                                size="sm"
                                onClick={() => navigate("/zcash")}
                            >
                                Connect Wallet
                            </Button>
                        </CardBody>
                    </Card>
                </div>
            )}

            {/* Connected wallet info */}
            {isConnected && (
                <div className="px-4 pb-4 max-w-2xl mx-auto w-full">
                    <Card className="bg-green-50 border-green-200">
                        <CardBody className="flex-row items-center justify-between py-2">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-sm text-green-800">
                                    Balance: <strong>{balance.available} tZEC</strong>
                                </span>
                            </div>
                            <code className="text-xs text-green-700 truncate max-w-[150px]">
                                {zcashAccount?.address}
                            </code>
                        </CardBody>
                    </Card>
                </div>
            )}

            {/* Chat Container */}
            <div className="flex-1 overflow-hidden px-4 pb-4 max-w-2xl mx-auto w-full">
                <div className="h-full flex flex-col bg-[#F9F9FA] rounded-3xl border border-gray-200 overflow-hidden">
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((message) => (
                            <ChatMessage key={message.id} message={message} isUser={message.isUser} />
                        ))}
                        {isLoading && <TypingIndicator />}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Example prompts */}
                    {messages.length <= 2 && (
                        <div className="px-4 pb-2">
                            <p className="text-xs text-gray-500 mb-2">Try asking:</p>
                            <div className="flex flex-wrap gap-2">
                                {EXAMPLE_PROMPTS.slice(0, 3).map((prompt, i) => (
                                    <button
                                        key={i}
                                        onClick={() => useExample(prompt)}
                                        className="text-xs px-3 py-1.5 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                                    >
                                        {prompt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Input */}
                    <div className="p-4 border-t border-gray-200 bg-white">
                        <div className="flex gap-2">
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Ask me anything about your ZEC..."
                                disabled={isLoading}
                                classNames={{
                                    inputWrapper: "bg-gray-100 rounded-full",
                                    input: "text-sm"
                                }}
                            />
                            <Button
                                isIconOnly
                                color="warning"
                                onClick={sendMessage}
                                disabled={isLoading || !input.trim()}
                                className="rounded-full"
                            >
                                {isLoading ? <Spinner size="sm" color="white" /> : <Send size={18} />}
                            </Button>
                        </div>
                        <p className="text-[10px] text-gray-400 text-center mt-2">
                            Powered by NEAR AI Cloud with TEE encryption
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
