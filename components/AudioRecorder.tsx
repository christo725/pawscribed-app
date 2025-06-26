import React, { useState, useRef, useEffect } from 'react';
import { MicrophoneIcon, StopIcon, PauseIcon, PlayIcon } from '@heroicons/react/24/solid';
import { CloudArrowUpIcon } from '@heroicons/react/24/outline';

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  onError?: (error: string) => void;
  patientId?: number;
}

type RecordingState = 'idle' | 'requesting-permission' | 'recording' | 'paused' | 'stopped';

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onRecordingComplete,
  onError,
  patientId
}) => {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Cleanup function
  const cleanup = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Audio level monitoring
  const monitorAudioLevel = () => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      const normalizedLevel = Math.min(100, (average / 255) * 100);
      
      setAudioLevel(normalizedLevel);
      
      if (recordingState === 'recording') {
        animationRef.current = requestAnimationFrame(updateLevel);
      }
    };
    
    updateLevel();
  };

  // Start recording
  const startRecording = async () => {
    try {
      setRecordingState('requesting-permission');
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      streamRef.current = stream;

      // Set up audio context for level monitoring
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        onRecordingComplete(blob, duration);
        setRecordingState('stopped');
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second

      setRecordingState('recording');
      setDuration(0);

      // Start timer
      intervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      // Start audio level monitoring
      monitorAudioLevel();

    } catch (error) {
      console.error('Error starting recording:', error);
      setRecordingState('idle');
      
      let errorMessage = 'Failed to access microphone';
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Microphone access denied. Please allow microphone access and try again.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No microphone found. Please check your audio devices.';
        } else if (error.name === 'NotSupportedError') {
          errorMessage = 'Audio recording not supported in this browser.';
        }
      }
      
      onError?.(errorMessage);
      cleanup();
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.stop();
      cleanup();
    }
  };

  // Pause recording
  const pauseRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingState('paused');
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  };

  // Resume recording
  const resumeRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordingState('recording');
      
      // Restart timer
      intervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      // Restart audio level monitoring
      monitorAudioLevel();
    }
  };

  // Reset to start new recording
  const resetRecording = () => {
    cleanup();
    setRecordingState('idle');
    setDuration(0);
    setAudioLevel(0);
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, []);

  // Recording button styling based on state
  const getButtonStyling = () => {
    const baseClasses = 'w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg';
    
    switch (recordingState) {
      case 'idle':
        return `${baseClasses} bg-blue-500 hover:bg-blue-600 text-white cursor-pointer`;
      case 'requesting-permission':
        return `${baseClasses} bg-yellow-500 text-white cursor-wait`;
      case 'recording':
        return `${baseClasses} bg-red-500 text-white cursor-pointer animate-pulse`;
      case 'paused':
        return `${baseClasses} bg-orange-500 text-white cursor-pointer`;
      case 'stopped':
        return `${baseClasses} bg-green-500 text-white cursor-pointer`;
      default:
        return baseClasses;
    }
  };

  // Audio level visualization
  const audioLevelBars = [];
  for (let i = 0; i < 5; i++) {
    const isActive = audioLevel > (i + 1) * 20;
    audioLevelBars.push(
      <div
        key={i}
        className={`w-2 h-8 mx-1 rounded transition-all duration-150 ${
          isActive ? 'bg-green-400' : 'bg-gray-300'
        }`}
        style={{
          height: isActive ? `${Math.min(32, (audioLevel / 100) * 32)}px` : '4px'
        }}
      />
    );
  }

  return (
    <div className="flex flex-col items-center space-y-6 p-6">
      {/* Recording Button */}
      <div className="relative">
        <button
          onClick={() => {
            if (recordingState === 'idle') {
              startRecording();
            } else if (recordingState === 'recording') {
              stopRecording();
            } else if (recordingState === 'paused') {
              resumeRecording();
            } else if (recordingState === 'stopped') {
              resetRecording();
            }
          }}
          disabled={recordingState === 'requesting-permission'}
          className={getButtonStyling()}
        >
          {recordingState === 'idle' && <MicrophoneIcon className="w-12 h-12" />}
          {recordingState === 'requesting-permission' && (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          )}
          {recordingState === 'recording' && <StopIcon className="w-12 h-12" />}
          {recordingState === 'paused' && <PlayIcon className="w-12 h-12" />}
          {recordingState === 'stopped' && <MicrophoneIcon className="w-12 h-12" />}
        </button>
        
        {/* Audio level indicator ring */}
        {recordingState === 'recording' && (
          <div 
            className="absolute inset-0 rounded-full border-4 border-green-400 animate-ping"
            style={{
              opacity: Math.max(0.3, audioLevel / 100),
              transform: `scale(${1 + audioLevel / 200})`
            }}
          />
        )}
      </div>

      {/* Status and Duration */}
      <div className="text-center">
        <div className="text-2xl font-mono text-gray-700 mb-2">
          {formatDuration(duration)}
        </div>
        
        <div className="text-sm text-gray-500 mb-4">
          {recordingState === 'idle' && 'Click to start recording'}
          {recordingState === 'requesting-permission' && 'Requesting microphone access...'}
          {recordingState === 'recording' && 'Recording... Click to stop'}
          {recordingState === 'paused' && 'Paused - Click to resume'}
          {recordingState === 'stopped' && 'Recording complete - Click to record again'}
        </div>

        {/* Audio Level Bars */}
        {recordingState === 'recording' && (
          <div className="flex items-end justify-center h-10">
            {audioLevelBars}
          </div>
        )}
      </div>

      {/* Recording Controls */}
      {recordingState === 'recording' && (
        <div className="flex space-x-4">
          <button
            onClick={pauseRecording}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center space-x-2"
          >
            <PauseIcon className="w-4 h-4" />
            <span>Pause</span>
          </button>
        </div>
      )}

      {/* Audio Playback */}
      {audioUrl && recordingState === 'stopped' && (
        <div className="w-full max-w-md">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Recording Preview:</p>
            <audio 
              controls 
              src={audioUrl} 
              className="w-full"
              preload="metadata"
            />
            <div className="mt-2 text-xs text-gray-500">
              Duration: {formatDuration(duration)} | 
              Size: {audioBlob ? (audioBlob.size / 1024 / 1024).toFixed(2) : '0'} MB
            </div>
          </div>
        </div>
      )}

      {/* Upload Alternative */}
      <div className="w-full max-w-md">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
          <CloudArrowUpIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-sm text-gray-600 mb-2">Or upload an audio file</p>
          <input
            type="file"
            accept="audio/*,.wav,.mp3,.m4a"
            className="hidden"
            id="audio-upload"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                // Handle file upload
                onRecordingComplete(file, 0); // Duration will be calculated on server
              }
            }}
          />
          <label
            htmlFor="audio-upload"
            className="text-blue-500 hover:text-blue-600 cursor-pointer text-sm"
          >
            Browse files
          </label>
          <p className="text-xs text-gray-400 mt-1">
            Supported formats: WAV, MP3, M4A (max 100MB)
          </p>
        </div>
      </div>
    </div>
  );
};