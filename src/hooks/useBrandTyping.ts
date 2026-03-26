import { useEffect, useState } from "react";

interface UseBrandTypingOptions {
  text: string;
  intervalMs: number;
  stepMs: number;
}

export function useBrandTyping({
  text,
  intervalMs,
  stepMs,
}: UseBrandTypingOptions) {
  const [typedText, setTypedText] = useState(text);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    const timeoutIds = new Set<number>();

    const schedule = (callback: () => void, delay: number) => {
      const timeoutId = window.setTimeout(() => {
        timeoutIds.delete(timeoutId);
        callback();
      }, delay);
      timeoutIds.add(timeoutId);
    };

    const runTypingCycle = () => {
      let index = 0;
      setIsTyping(true);
      setTypedText("");

      const typeNext = () => {
        index += 1;
        setTypedText(text.slice(0, index));

        if (index < text.length) {
          schedule(typeNext, stepMs);
          return;
        }

        setIsTyping(false);
        schedule(runTypingCycle, intervalMs);
      };

      schedule(typeNext, stepMs);
    };

    schedule(runTypingCycle, intervalMs);

    return () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutIds.clear();
    };
  }, [intervalMs, stepMs, text]);

  return { typedText, isTyping };
}
