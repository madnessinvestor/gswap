import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Loader2, ArrowRight, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BridgeStep {
  id: string;
  label: string;
  status: 'pending' | 'loading' | 'completed';
  description?: string;
}

interface BridgeProgressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  direction: 'sepolia-to-arc' | 'arc-to-sepolia';
  amount: string;
  onComplete: () => void;
}

export default function BridgeProgressModal({ 
  open, 
  onOpenChange, 
  direction, 
  amount,
  onComplete 
}: BridgeProgressModalProps) {
  const [steps, setSteps] = useState<BridgeStep[]>([
    { id: 'approve', label: 'Approve USDC', status: 'pending', description: 'Waiting for approval...' },
    { id: 'burn', label: 'Burn on source', status: 'pending', description: 'Burning tokens...' },
    { id: 'attestation', label: 'Attestation...', status: 'pending', description: 'Fetching attestation from Circle API...' },
    { id: 'mint', label: `Mint on ${direction === 'sepolia-to-arc' ? 'Arc' : 'Sepolia'}`, status: 'pending', description: 'Processing receive message...' }
  ]);
  
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      startProcess();
    } else {
      // Reset state when closed
      setIsSuccess(false);
      setSteps(steps.map(s => ({ ...s, status: 'pending' })));
    }
  }, [open]);

  const startProcess = async () => {
    // 1. Approve
    updateStep('approve', 'loading', 'Approving USDC...');
    await new Promise(r => setTimeout(r, 2000));
    updateStep('approve', 'completed', 'Approval completed');

    // 2. Burn
    updateStep('burn', 'loading', 'Burning tokens on source chain...');
    await new Promise(r => setTimeout(r, 3000));
    updateStep('burn', 'completed', 'Burn completed');

    // 3. Attestation
    updateStep('attestation', 'loading', 'Fetching attestation from Circle API...');
    await new Promise(r => setTimeout(r, 4000));
    updateStep('attestation', 'completed', 'Attestation fetched');

    // 4. Mint
    updateStep('mint', 'loading', 'Minting tokens on destination...');
    await new Promise(r => setTimeout(r, 3000));
    updateStep('mint', 'completed', 'Mint completed');

    setIsSuccess(true);
  };

  const updateStep = (id: string, status: 'pending' | 'loading' | 'completed', description?: string) => {
    setSteps(prev => prev.map(step => 
      step.id === id ? { ...step, status, description: description || step.description } : step
    ));
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      // Prevent closing while processing, allow if success
      if (isSuccess || !val) onOpenChange(val);
    }}>
      <DialogContent className="sm:max-w-md bg-[#1c1038] border-[#3b1f69] text-white p-0 overflow-hidden gap-0">
        {!isSuccess ? (
          <div className="p-6">
            <h2 className="text-xl font-bold mb-6 text-center">Bridge Progress</h2>
            <div className="space-y-4">
              {steps.map((step, index) => (
                <motion.div 
                  key={step.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`relative overflow-hidden rounded-xl border p-4 transition-all duration-300 ${
                    step.status === 'loading' 
                      ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(249,115,22,0.15)]' 
                      : step.status === 'completed'
                        ? 'bg-white/5 border-white/10'
                        : 'bg-white/5 border-transparent opacity-50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      {step.status === 'completed' ? (
                        <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        </div>
                      ) : step.status === 'loading' ? (
                        <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center animate-pulse shadow-lg shadow-orange-500/30">
                             <Loader2 className="w-4 h-4 text-white animate-spin" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                             <Circle className="w-4 h-4 text-white/30" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-semibold ${step.status === 'loading' ? 'text-orange-400' : 'text-white'}`}>
                        {step.label}
                      </h3>
                      <p className="text-sm text-white/60 mt-0.5">
                        {step.description}
                      </p>
                    </div>
                  </div>
                  
                  {/* Progress Bar for Loading State */}
                  {step.status === 'loading' && (
                      <motion.div 
                        className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-orange-500 to-orange-300"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }}
                      />
                  )}
                </motion.div>
              ))}
            </div>
            
            <div className="mt-8">
                <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold h-12 text-lg shadow-lg shadow-orange-500/20" disabled>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Bridging...
                </Button>
            </div>
          </div>
        ) : (
          <div className="p-8 flex flex-col items-center text-center bg-white">
            <div className="w-full mb-6">
                 <h2 className="text-2xl font-bold text-gray-900 text-left">Bridge Tokens</h2>
                 <div className="flex items-center gap-2 mt-1">
                    <span className="bg-blue-100 text-blue-600 text-xs font-bold px-2 py-0.5 rounded">Cross-Chain</span>
                    <span className="text-gray-500 text-sm">Transfer USDC between {direction === 'sepolia-to-arc' ? 'Sepolia' : 'Arc'} and {direction === 'sepolia-to-arc' ? 'Arc Testnet' : 'Sepolia'}</span>
                 </div>
            </div>

            <div className="my-8">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-white" />
                    </div>
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-2">Bridge Successful!</h3>
                <p className="text-gray-500 max-w-xs mx-auto">
                    Your USDC has been successfully transferred from {direction === 'sepolia-to-arc' ? 'Sepolia' : 'Arc Testnet'} to {direction === 'sepolia-to-arc' ? 'Arc Testnet' : 'Sepolia'}.
                </p>
            </div>

            <div className="flex gap-4 text-sm font-medium text-orange-500 mb-8">
                <a href="#" className="flex items-center hover:underline">
                    View Sepolia Transaction <ExternalLink className="w-3 h-3 ml-1" />
                </a>
                <a href="#" className="flex items-center hover:underline">
                    View Receive Message Transaction <ExternalLink className="w-3 h-3 ml-1" />
                </a>
            </div>

            <Button 
                onClick={() => {
                    onComplete();
                    onOpenChange(false);
                }} 
                className="w-full max-w-xs bg-orange-500 hover:bg-orange-600 text-white font-bold h-12"
            >
                Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}