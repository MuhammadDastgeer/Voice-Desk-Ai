import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Send, MessageSquare, Volume2, Sparkles, Key, Settings, Check, X } from 'lucide-react';

interface Message {
  sender: 'agent' | 'user';
  text: string;
  timestamp: string;
}

interface APIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_calls?: any[];
  tool_call_id?: string;
}

interface DialerSimProps {
  agentName?: string;
  agentVoice?: string;
  onAppointmentBooked?: (name: string, vehicle: string, service: string) => void;
  isFloating?: boolean;
  systemPrompt?: string;
  greetingMessage?: string;
  services?: any[];
  onAppointmentBookedDirect?: (args: {
    customerName: string;
    phoneNumber: string;
    vehicleYear: string;
    vehicleMake: string;
    vehicleModel: string;
    serviceName: string;
    scheduledAt: string;
    notes: string;
  }) => Promise<void>;
}

export default function DialerSim({ 
  agentName = "Health Reception AI", 
  agentVoice = "Alloy - Neutral",
  onAppointmentBooked,
  isFloating = false,
  systemPrompt = "",
  greetingMessage = "",
  services = [],
  onAppointmentBookedDirect
}: DialerSimProps) {
  const [isCalling, setIsCalling] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [duration, setDuration] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [bookingState, setBookingState] = useState<{ step: number; name: string; vehicle: string; service: string } | null>(null);
  const [isOpen, setIsOpen] = useState(false); // Used only if isFloating

  // OpenAI Integration States
  const [openaiKey, setOpenaiKey] = useState<string>(() => {
    return (import.meta as any).env.VITE_OPENAI_API_KEY || localStorage.getItem('vd_openai_api_key_override') || '';
  });
  const [isLiveMode, setIsLiveMode] = useState<boolean>(() => {
    const hasKey = !!((import.meta as any).env.VITE_OPENAI_API_KEY || localStorage.getItem('vd_openai_api_key_override'));
    return hasKey;
  });
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [tempKeyInput, setTempKeyInput] = useState(openaiKey);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [apiMessages, setApiMessages] = useState<APIMessage[]>([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Sync temp key input if props or environments change
  useEffect(() => {
    setTempKeyInput(openaiKey);
  }, [openaiKey]);

  // Text-To-Speech function
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Try to find a pleasant female/neutral English voice
      const voices = window.speechSynthesis.getVoices();
      const selectedVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Zira'))) || voices[0];
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      
      utterance.rate = 1.0;
      utterance.pitch = 1.05;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      window.speechSynthesis.speak(utterance);
    } else {
      // Fallback animations
      setIsSpeaking(true);
      setTimeout(() => setIsSpeaking(false), 2000);
    }
  };

  // Scroll transcript to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  // Duration Timer
  useEffect(() => {
    if (isCalling) {
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setDuration(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isCalling]);

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  // OpenAI API fetch
  const fetchAIResponseFromOpenAI = async (currentHistory: APIMessage[]) => {
    setIsAiLoading(true);
    setIsSpeaking(true);
    try {
      const activeKey = openaiKey || (import.meta as any).env.VITE_OPENAI_API_KEY || localStorage.getItem('vd_openai_api_key_override') || '';
      
      if (!activeKey) {
        throw new Error("No OpenAI API key provided. Please configure it in the settings tab.");
      }

      // Define tool for booking appointment
      const tools = [
        {
          type: "function",
          function: {
            name: "book_appointment",
            description: "Book an appointment for the customer. ONLY call this when the customer has specified: 1. Customer Name, 2. Phone Number, 3. Vehicle Details (Make and Model), 4. Service Type, and 5. Date & Time. Please confirm with them before booking.",
            parameters: {
              type: "object",
              properties: {
                customer_name: { type: "string", description: "The customer's full name" },
                phone_number: { type: "string", description: "The customer's contact phone number" },
                vehicle_year: { type: "string", description: "Vehicle year (default to 2021 if not specified)" },
                vehicle_make: { type: "string", description: "Vehicle make (e.g., Toyota)" },
                vehicle_model: { type: "string", description: "Vehicle model (e.g., Camry)" },
                service_name: { type: "string", description: "The service being booked. Must match or be close to the garage's available services." },
                scheduled_at: { type: "string", description: "The date and time for the appointment (e.g., Saturday at 10:00 AM)" },
                notes: { type: "string", description: "Any special requests or details discussed" }
              },
              required: ["customer_name", "phone_number", "vehicle_make", "vehicle_model", "service_name", "scheduled_at"]
            }
          }
        }
      ];

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: currentHistory.map(m => ({ role: m.role, content: m.content, name: m.name, tool_calls: m.tool_calls, tool_call_id: m.tool_call_id })),
          tools: tools,
          tool_choice: 'auto'
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || 'Failed to fetch from OpenAI');
      }

      const data = await response.json();
      const choice = data.choices[0];
      const message = choice.message;

      let replyText = message.content || "";
      const toolCalls = message.tool_calls;

      const newHistory = [...currentHistory, message];

      if (toolCalls && toolCalls.length > 0) {
        const toolCall = toolCalls[0];
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        if (functionName === 'book_appointment') {
          console.log("OpenAI requested appointment booking with args:", args);
          
          let success = false;
          try {
            if (onAppointmentBookedDirect) {
              await onAppointmentBookedDirect({
                customerName: args.customer_name,
                phoneNumber: args.phone_number || '9999999999',
                vehicleYear: args.vehicle_year || '2021',
                vehicleMake: args.vehicle_make,
                vehicleModel: args.vehicle_model,
                serviceName: args.service_name,
                scheduledAt: args.scheduled_at,
                notes: args.notes || 'Booked via simulated live OpenAI voice receptionist'
              });
              success = true;
            } else if (onAppointmentBooked) {
              onAppointmentBooked(args.customer_name, `${args.vehicle_year || '2021'} ${args.vehicle_make} ${args.vehicle_model}`, args.service_name);
              success = true;
            }
          } catch (bookErr) {
            console.error("Error booking appointment via tool:", bookErr);
          }

          const toolResponseContent = success 
            ? `Successfully booked appointment in the database for ${args.customer_name} on ${args.scheduled_at} for a ${args.service_name} on their ${args.vehicle_make} ${args.vehicle_model}. Inform the user that the booking is completed and confirmed.`
            : `Failed to book appointment due to database error. Please inform the user.`;

          const toolHistory = [
            ...newHistory,
            {
              role: 'tool' as const,
              tool_call_id: toolCall.id,
              name: functionName,
              content: toolResponseContent
            }
          ];

          await fetchAIResponseFromOpenAI(toolHistory);
          return;
        }
      }

      if (replyText) {
        setTranscript(prev => [
          ...prev,
          { sender: 'agent', text: replyText, timestamp: formatDuration(duration) }
        ]);
        speakText(replyText);
      }
      setApiMessages(newHistory);

    } catch (err: any) {
      console.error(err);
      const errMsg = `Error: ${err.message || 'Something went wrong with OpenAI API.'}`;
      setTranscript(prev => [
        ...prev,
        { sender: 'agent', text: errMsg, timestamp: formatDuration(duration) }
      ]);
      speakText("I encountered an issue communicating with my brain. Please check your API key configuration.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Start Call
  const startCall = () => {
    setIsCalling(true);
    setTranscript([]);
    setDuration(0);
    setBookingState(null);
    
    const welcomeMsg = greetingMessage || `Hello! Thank you for calling AutoCare Pro Garage support. I am ${agentName}, your AI receptionist. How can I help you today?`;
    
    if (isLiveMode && (openaiKey || (import.meta as any).env.VITE_OPENAI_API_KEY)) {
      // Initialize OpenAI messages
      const servicesContext = services && services.length > 0 
        ? `Here are the active services we offer:\n${services.map(s => `- ${s.name}: $${s.price} (${s.description})`).join('\n')}`
        : `We offer standard automotive services: Oil Change ($49.99), Brake Inspection ($39.99), Tire Rotation ($29.99), and Engine Diagnostics ($89.99).`;

      const systemInstructions = `${systemPrompt || "You are a professional automotive receptionist assistant."}\n\n` +
        `CONTEXT & REAL-TIME INFO:\n` +
        `- Garage Name: AutoCare Pro Garage\n` +
        `- Business Hours: Mon-Fri: 8:00 AM - 6:00 PM, Sat: 9:00 AM - 2:00 PM, Sun: Closed\n` +
        `${servicesContext}\n\n` +
        `BEHAVIORAL RULES:\n` +
        `1. You are talking over a real-time voice call. Speak concisely (1-3 sentences max). Keep it highly conversational, professional, and friendly.\n` +
        `2. NEVER output markdown (like asterisks, bolding, bullet lists, or tables) because your text is read aloud by a Text-to-Speech engine. Send clear, plain sentences.\n` +
        `3. When a customer wants to book an appointment, ask for their name, phone number, vehicle details (year, make, model), and preferred date/time.\n` +
        `4. Once they provide the details and agree, call the 'book_appointment' tool to lock it in. Always confirm the appointment with the user after calling the tool.\n` +
        `5. If they ask about services or pricing, use the context above to respond accurately.`;

      const initialHistory: APIMessage[] = [
        { role: 'system', content: systemInstructions },
        { role: 'assistant', content: welcomeMsg }
      ];
      setApiMessages(initialHistory);
    }

    // Add welcome message with a slight delay
    setTimeout(() => {
      setTranscript([
        { sender: 'agent', text: welcomeMsg, timestamp: formatDuration(0) }
      ]);
      speakText(welcomeMsg);
    }, 600);
  };

  // End Call
  const endCall = () => {
    setIsCalling(false);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  // Handle Voice responses
  const handleAIResponse = (userText: string) => {
    if (isLiveMode && (openaiKey || (import.meta as any).env.VITE_OPENAI_API_KEY)) {
      const nextHistory = [
        ...apiMessages,
        { role: 'user' as const, content: userText }
      ];
      setApiMessages(nextHistory);
      fetchAIResponseFromOpenAI(nextHistory);
      return;
    }

    // Fallback Mock State Machine Simulation
    const textLower = userText.toLowerCase();
    let reply = "";

    if (bookingState) {
      if (bookingState.step === 1) {
        const service = userText;
        setBookingState({ ...bookingState, step: 2, service });
        reply = `Got it, a ${service}. And what is your vehicle make, model and year?`;
      } else if (bookingState.step === 2) {
        const vehicle = userText;
        setBookingState({ ...bookingState, step: 3, vehicle });
        reply = `Excellent. I have a slot available this Saturday at 10:00 AM for your ${vehicle} ${bookingState.service}. May I please have your full name and phone number to lock this in?`;
      } else if (bookingState.step === 3) {
        const name = userText;
        reply = `Awesome, ${name}! Your appointment is fully confirmed for Saturday at 10:00 AM for the ${bookingState.service}. We look forward to seeing you at AutoCare Pro Garage!`;
        
        if (onAppointmentBookedDirect) {
          onAppointmentBookedDirect({
            customerName: name,
            phoneNumber: '9999999999',
            vehicleYear: '2021',
            vehicleMake: 'Toyota',
            vehicleModel: 'Camry',
            serviceName: bookingState.service || 'Oil Change',
            scheduledAt: 'Saturday 10:00 AM',
            notes: 'Booked via simulated local client receptionist'
          }).catch(err => console.error(err));
        } else if (onAppointmentBooked) {
          onAppointmentBooked(name, bookingState.vehicle || '2019 Toyota Camry', bookingState.service || 'Oil Change');
        }
        setBookingState(null);
      }
    } else {
      if (textLower.includes('oil') || textLower.includes('lub') || textLower.includes('change')) {
        setBookingState({ step: 1, name: '', vehicle: '', service: 'Oil Change' });
        reply = "I would be happy to book an Oil Change for you! Our premium service is $49.99. What vehicle is this for?";
      } else if (textLower.includes('brake') || textLower.includes('squeak') || textLower.includes('inspect')) {
        setBookingState({ step: 1, name: '', vehicle: '', service: 'Brake Inspection' });
        reply = "I can definitely schedule a Brake Inspection for you. It's starting from $39.99 and includes a comprehensive fluid & pad check. What is the vehicle model?";
      } else if (textLower.includes('hour') || textLower.includes('open') || textLower.includes('time') || textLower.includes('sunday')) {
        reply = "AutoCare Pro Garage is open Monday through Friday from 8:00 AM to 6:00 PM, and Saturdays from 9:00 AM to 2:00 PM. We are closed on Sundays.";
      } else if (textLower.includes('diagnostic') || textLower.includes('check engine')) {
        reply = "Yes! We offer professional computer diagnostics. We can read fault codes and trace engine issues. Would you like to book a diagnostic session?";
      } else if (textLower.includes('price') || textLower.includes('cost') || textLower.includes('charge')) {
        reply = "Our basic Brake Inspection is $39.99, an Oil Change is $49.99, and tire rotation is $29.99. For other custom repairs, our technician provides a free quote after inspection!";
      } else if (textLower.includes('where') || textLower.includes('address') || textLower.includes('location')) {
        reply = "We are located at 742 Market Street, San Francisco, California 94103. Right in the heart of downtown!";
      } else {
        reply = "I can help you book a service like an Oil Change, check our business hours, or answer pricing questions. What would you like to do?";
      }
    }

    // Add response
    setTimeout(() => {
      setTranscript(prev => [
        ...prev,
        { sender: 'agent', text: reply, timestamp: formatDuration(duration) }
      ]);
      speakText(reply);
    }, 800);
  };

  const handleSendMessage = (textToSend: string) => {
    if (!textToSend.trim() || !isCalling) return;

    const newMsg: Message = {
      sender: 'user',
      text: textToSend,
      timestamp: formatDuration(duration)
    };

    setTranscript(prev => [...prev, newMsg]);
    setInputText('');
    handleAIResponse(textToSend);
  };

  const handleQuickPrompt = (prompt: string) => {
    handleSendMessage(prompt);
  };

  const saveCustomOpenAIKey = () => {
    localStorage.setItem('vd_openai_api_key_override', tempKeyInput);
    setOpenaiKey(tempKeyInput);
    setIsLiveMode(!!tempKeyInput);
    setShowKeyConfig(false);
    alert('OpenAI API Key saved successfully! Real-time agent mode is now activated.');
  };

  const clearCustomOpenAIKey = () => {
    localStorage.removeItem('vd_openai_api_key_override');
    setOpenaiKey('');
    setTempKeyInput('');
    setIsLiveMode(false);
    setShowKeyConfig(false);
    alert('OpenAI API Key cleared. Switched back to offline simulation mode.');
  };

  const currentWidget = (
    <div className="bg-[#0e1322] border border-[#3B82F6]/20 rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col h-[520px]">
      {/* Background radial glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-[#3B82F6]/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#3B82F6]/20 flex items-center justify-center border border-[#3B82F6]/30">
            <Volume2 className="w-5 h-5 text-[#3B82F6]" />
          </div>
          <div>
            <h3 className="text-white font-medium text-sm flex items-center gap-2">
              {agentName}
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3B82F6] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3B82F6]"></span>
              </span>
            </h3>
            <p className="text-xs text-gray-400">{agentVoice}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isCalling && (
            <button 
              onClick={() => setShowKeyConfig(!showKeyConfig)}
              className="p-1.5 bg-gray-900 border border-gray-800 text-gray-400 hover:text-white rounded-lg transition-all cursor-pointer hover:border-gray-700"
              title="Configure OpenAI API Key"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
          {isCalling && (
            <span className="text-xs font-mono text-[#3B82F6] bg-[#3B82F6]/10 px-2.5 py-1 rounded-full border border-[#3B82F6]/20">
              {formatDuration(duration)}
            </span>
          )}
        </div>
      </div>

      {/* Body: Transcript, Calling Screen, or Settings */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {showKeyConfig ? (
          <div className="flex-1 flex flex-col justify-between p-2">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-2">
                <span className="text-xs font-bold text-[#3B82F6] uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" /> OpenAI Configuration
                </span>
                <button 
                  onClick={() => setShowKeyConfig(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">OpenAI API Key</label>
                <div className="relative">
                  <input 
                    type="password"
                    value={tempKeyInput}
                    onChange={(e) => setTempKeyInput(e.target.value)}
                    placeholder="sk-proj-..."
                    className="w-full bg-gray-950 border border-gray-800 focus:border-[#3B82F6] text-xs text-white rounded-lg px-3 py-2 pl-8 outline-none"
                  />
                  <Key className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-3" />
                </div>
                <p className="text-[9.5px] text-gray-500 leading-normal">
                  Enter your OpenAI API key or set <code>VITE_OPENAI_API_KEY</code> in <code>.env.example</code>. The key is securely saved locally.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-gray-300 font-medium">Use Real OpenAI AI Responses</span>
                <button 
                  onClick={() => {
                    const activeKey = tempKeyInput || openaiKey || (import.meta as any).env.VITE_OPENAI_API_KEY;
                    if (!activeKey) {
                      alert("Please enter a valid OpenAI API key first.");
                      return;
                    }
                    setIsLiveMode(!isLiveMode);
                  }}
                  className={`w-10 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors ${
                    isLiveMode ? 'bg-[#3B82F6]' : 'bg-gray-800 border border-gray-700'
                  }`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${
                    isLiveMode ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-gray-800">
              <button 
                onClick={clearCustomOpenAIKey}
                className="flex-1 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 text-xs py-2 rounded-lg border border-red-500/20 transition-all cursor-pointer font-bold"
              >
                Clear Key
              </button>
              <button 
                onClick={saveCustomOpenAIKey}
                className="flex-1 bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white text-xs py-2 rounded-lg font-bold transition-all cursor-pointer"
              >
                Save Key
              </button>
            </div>
          </div>
        ) : !isCalling ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-[#3B82F6]/20 rounded-full blur-xl animate-pulse"></div>
              <button 
                onClick={startCall}
                className="w-20 h-20 bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] hover:from-[#3B82F6]/90 hover:to-[#8B5CF6]/90 text-white rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg shadow-[#3B82F6]/30 cursor-pointer relative z-10"
              >
                <Phone className="w-9 h-9 text-white fill-current" />
              </button>
            </div>
            <h4 className="text-white font-semibold text-lg mb-2">Simulate Live Voice Call</h4>
            <p className="text-gray-400 text-xs max-w-xs mb-4">
              Click the call button to speak directly to the AI Receptionist. Make sure your speakers are on!
            </p>
            <div 
              onClick={() => setShowKeyConfig(true)}
              className="text-[10px] font-mono border px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer hover:bg-gray-900/60 transition-all border-gray-800/60 bg-gray-950/40"
            >
              {isLiveMode ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-[#10B981] animate-pulse" />
                  <span className="text-[#10B981] font-bold">Live GPT-4o-mini Agent Active</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  <span className="text-gray-400">Local Simulated Agent (Click to activate real AI)</span>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full justify-between">
            {/* Live Transcript Panel */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto space-y-3.5 pr-2 mb-4 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent max-h-[300px]"
            >
              {transcript.length === 0 ? (
                <div className="flex items-center justify-center h-full text-xs text-gray-500 italic">
                  Dialing and connecting...
                </div>
              ) : (
                transcript.map((msg, idx) => (
                  <div 
                    key={idx}
                    className={`flex flex-col max-w-[85%] ${msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                  >
                    <div className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                      msg.sender === 'user' 
                        ? 'bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white rounded-tr-none' 
                        : 'bg-gray-900 text-gray-100 border border-gray-800 rounded-tl-none'
                    }`}>
                      {msg.text}
                    </div>
                    <span className="text-[9px] text-gray-500 font-mono mt-1 px-1">{msg.timestamp}</span>
                  </div>
                ))
              )}
            </div>

            {/* Quick Helper suggestions */}
            {transcript.length > 0 && (
              <div className="mb-3.5">
                <p className="text-[10px] text-gray-500 font-medium mb-1.5 uppercase tracking-wider flex items-center gap-1">
                  <MessageSquare className="w-3 h-3 text-[#3B82F6]" /> Choose what to say:
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-[75px] overflow-y-auto">
                  <button 
                    onClick={() => handleQuickPrompt("I'd like to book an oil change")}
                    className="text-[11px] bg-gray-900 hover:bg-[#3B82F6]/10 hover:text-[#3B82F6] text-gray-300 px-2.5 py-1 rounded-full border border-gray-800 hover:border-[#3B82F6]/30 transition-all text-left cursor-pointer"
                  >
                    🗓️ Book Oil Change
                  </button>
                  <button 
                    onClick={() => handleQuickPrompt("What are your business hours?")}
                    className="text-[11px] bg-gray-900 hover:bg-[#3B82F6]/10 hover:text-[#3B82F6] text-gray-300 px-2.5 py-1 rounded-full border border-gray-800 hover:border-[#3B82F6]/30 transition-all text-left cursor-pointer"
                  >
                    ⏰ Check business hours
                  </button>
                  <button 
                    onClick={() => handleQuickPrompt("How much is a brake inspection?")}
                    className="text-[11px] bg-gray-900 hover:bg-[#3B82F6]/10 hover:text-[#3B82F6] text-gray-300 px-2.5 py-1 rounded-full border border-gray-800 hover:border-[#3B82F6]/30 transition-all text-left cursor-pointer"
                  >
                    💲 Check brake pricing
                  </button>
                  <button 
                    onClick={() => handleQuickPrompt("Do you do engine diagnostics?")}
                    className="text-[11px] bg-gray-900 hover:bg-[#3B82F6]/10 hover:text-[#3B82F6] text-gray-300 px-2.5 py-1 rounded-full border border-gray-800 hover:border-[#3B82F6]/30 transition-all text-left cursor-pointer"
                  >
                    🛠️ Engine diagnostics?
                  </button>
                </div>
              </div>
            )}

            {/* Dynamic Waveform Simulation */}
            <div className="bg-gray-950/80 border border-gray-800 rounded-xl p-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="flex items-end gap-[3px] h-7 w-20">
                  <div className={`w-[3px] bg-[#3B82F6] rounded-full h-2 ${isSpeaking ? 'animate-wave-1' : ''}`}></div>
                  <div className={`w-[3px] bg-[#3B82F6] rounded-full h-4 ${isSpeaking ? 'animate-wave-2' : ''}`}></div>
                  <div className={`w-[3px] bg-[#8B5CF6] rounded-full h-6 ${isSpeaking ? 'animate-wave-3' : ''}`}></div>
                  <div className={`w-[3px] bg-[#3B82F6] rounded-full h-3 ${isSpeaking ? 'animate-wave-4' : ''}`}></div>
                  <div className={`w-[3px] bg-[#3B82F6] rounded-full h-5 ${isSpeaking ? 'animate-wave-5' : ''}`}></div>
                  <div className={`w-[3px] bg-[#8B5CF6] rounded-full h-2 ${isSpeaking ? 'animate-wave-2' : ''}`}></div>
                </div>
                <span className="text-[10px] font-mono text-gray-400">
                  {isSpeaking ? 'AI is speaking...' : 'Ready to listen...'}
                </span>
              </div>

              {/* End Call button */}
              <button 
                onClick={endCall}
                className="bg-red-500/20 hover:bg-red-500 hover:text-white text-red-400 p-2 rounded-lg border border-red-500/30 transition-all flex items-center gap-1 text-xs cursor-pointer"
              >
                <PhoneOff className="w-3.5 h-3.5" />
                <span>Hang Up</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer text field to chat manually */}
      {isCalling && (
        <div className="mt-3.5 border-t border-gray-800 pt-3 flex gap-2">
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputText)}
            placeholder="Type your message and click send..." 
            className="flex-1 bg-gray-950 border border-gray-800 focus:border-[#3B82F6] text-xs text-white rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-[#3B82F6]"
          />
          <button 
            onClick={() => handleSendMessage(inputText)}
            className="bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] hover:from-[#3B82F6]/90 hover:to-[#8B5CF6]/90 text-white px-3 rounded-lg flex items-center justify-center transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );

  if (!isFloating) {
    return currentWidget;
  }

  // Floating Widget Render style (bottom right floating button + popover modal)
  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-[380px] sm:w-[420px] transition-all duration-300 transform translate-y-0 opacity-100">
          <div className="shadow-2xl shadow-emerald-950/50">
            {currentWidget}
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <div className="relative group">
        {!isOpen && (
          <span className="absolute -top-12 right-0 bg-[#0e1322] border border-[#3B82F6]/30 text-[#3B82F6] text-[11px] px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
            Talk to AI receptionist! 📞
          </span>
        )}
        <button
          id="floating-phone-btn"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 transform hover:scale-105 cursor-pointer border ${
            isOpen 
              ? 'bg-red-500 text-white border-red-600 hover:bg-red-600' 
              : 'bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white border-none shadow-md shadow-[#3B82F6]/25 animate-bounce'
          }`}
        >
          {isOpen ? (
            <PhoneOff className="w-6 h-6" />
          ) : (
            <Phone className="w-6 h-6 fill-current" />
          )}
        </button>
      </div>
    </div>
  );
}
