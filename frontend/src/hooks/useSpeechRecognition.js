import { useState, useEffect, useCallback } from 'react';

export default function useSpeechRecognition({ onResult }) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Browser does not support Speech Recognition.');
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US'; // Default to English, could be overridden

    rec.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    rec.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      if (onResult) {
        onResult({ interimTranscript, finalTranscript });
      }
    };

    rec.onerror = (event) => {
      if (event.error !== 'aborted') {
        setError(event.error);
        setIsListening(false);
      }
    };

    rec.onend = () => {
      // In continuous mode, some browsers might stop on long silence
      // We'll manage resetting the state here.
      setIsListening(false);
    };

    setRecognition(rec);

    return () => {
      rec.stop();
    };
  }, [onResult]);

  const toggleListening = useCallback(() => {
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
    } else {
      try {
        recognition.start();
      } catch (e) {
        // Handle case where it's already started or another bug
        console.error('Speech recognition error on start:', e);
      }
    }
  }, [recognition, isListening]);

  const stopListening = useCallback(() => {
    if (!recognition) return;
    if (isListening) recognition.stop();
  }, [recognition, isListening]);

  return {
    isListening,
    error,
    toggleListening,
    stopListening
  };
}
