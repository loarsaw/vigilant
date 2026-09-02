import { Device } from "@twilio/voice-sdk";
import { useRef, useState } from "react";
import { apiClient } from "@/lib/axios";

export function useCall() {
  const deviceRef = useRef<Device | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setup() {
    try {
      const { data } = await apiClient.get("/call/token"); 
      const device = new Device(data.token, { logLevel: 1 });
      device.on("registered", () => setIsReady(true));
      device.on("error", (e) => {
        console.error("Twilio device error:", e); 
        setError(e.message);
      });
      await device.register();
      deviceRef.current = device;
    } catch (e: any) {
      console.error("Setup failed:", e);
      setError(e.message);
    }
  }

  async function makeCall(to: string) {
    if (!deviceRef.current) await setup();
    setIsCalling(true);
    setError(null);
    try {
      const call = await deviceRef.current!.connect({
        params: { To: to }, 
      });
      call.on("disconnect", () => setIsCalling(false));
    } catch (e: any) {
      setError(e.message);
      setIsCalling(false);
    }
  }

  function hangUp() {
    deviceRef.current?.disconnectAll();
    setIsCalling(false);
  }

  return { makeCall, hangUp, isCalling, isReady, error, setup };
}
