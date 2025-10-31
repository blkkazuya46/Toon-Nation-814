


import React, { useState, useCallback, useRef, useEffect } from 'react';
import { toonifyImage, editToonifiedImage, generateCaption, STYLE_CATEGORIES, ToonStyle, StyleCategory, ALL_STYLES_MAP, generateImageFromScratch, animateImage, StyleDefinition, faceSwapImage, upscaleImage } from './services/geminiService';
import { blobToBase64, resizeImage, applyAdjustments, cropImage, applyFilter } from './utils/fileUtils';
import { initDB, addCreation, getCreations, deleteCreation, Creation } from './utils/db';
import { UploadIcon, SparklesIcon, DownloadIcon, ArrowPathIcon, PaintBrushIcon, FilmIcon, PaletteIcon, GameControllerIcon, TicketIcon, CameraIcon, VideoCameraIcon, SearchIcon, UserCircleIcon, SwitchCameraIcon, FaceFrownIcon, FaceSmileIcon, UserIcon as PoseIcon, TshirtIcon, PhotoIcon, SunIcon, ChatBubbleLeftRightIcon, CubeTransparentIcon, ChevronDownIcon, PencilIcon, PencilSquareIcon, CropIcon, ArrowUturnLeftIcon, ContrastIcon, ScissorsIcon, AdjustmentsHorizontalIcon, RotateIcon, StarIcon, BookmarkSquareIcon, TrashIcon, ArrowUturnRightIcon, CheckIcon, XMarkIcon, PlayCircleIcon, PauseCircleIcon, UserIcon, FaceSwapIcon } from './components/icons';

type AppState = 'idle' | 'imageSelected' | 'loading' | 'success' | 'error';
type AppMode = 'toonify' | 'faceSwap' | 'fromScratch';
type MediaType = 'image' | 'video' | 'faceSwapResult';
type ShotType = 'full-body' | 'head-shot';

type OriginalImage = {
  src: string;
  base64: string;
  mimeType: string;
};

type Adjustments = {
    rotation: number;
    brightness: number;
    contrast: number;
    saturation: number;
};

const INITIAL_ADJUSTMENTS: Adjustments = {
    rotation: 0, brightness: 100, contrast: 100, saturation: 100
};

const EDIT_SUGGESTIONS = [
    'add sunglasses',
    'change hair to blue',
    'make the background a galaxy',
    'add a cool hat',
    'give them a smiling expression',
    'change shirt color to red',
    'add a sci-fi visor',
    'put them in a futuristic city',
    'make them look older',
    'add a scar on their face',
    'give them a pirate eye patch',
    'surround them with glowing butterflies',
];

const getFriendlyErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
        const message = error.message.toLowerCase();

        if (message.includes('quota') || message.includes('resource_exhausted')) {
            const retryMatch = error.message.match(/retry in ([\d.]+s)/i);
            if (retryMatch && retryMatch[1]) {
                return `The AI is temporarily busy. Please try again in about ${retryMatch[1]}.`;
            }
            return "You've exceeded the API usage quota. Please check your plan, billing details (ai.google.dev/gemini-api/docs/billing), and rate limits (ai.google.dev/gemini-api/docs/rate-limits).";
        }
        if (message.includes('requested entity was not found')) {
            return "API Key not found or invalid. Please select your key and ensure your project has billing enabled. See: ai.google.dev/gemini-api/docs/billing";
        }
        if (message.includes('no image was generated')) {
            return "The AI couldn't create an image. This might be due to our safety filters or an unclear request. Please try a different image or style combination.";
        }
        if (message.includes('safety') || message.includes('blocked')) {
            return "Your request was blocked for safety reasons. Please try a different image or prompt.";
        }
        if (message.includes('fetch') || message.includes('network')) {
            return "Couldn't connect to the AI. Please check your internet connection and try again.";
        }
        if (message.includes('api key')) {
            return "There's a problem with the application's configuration. Please try again later.";
        }
        return `An unexpected error occurred: ${error.message}`;
    }
    return 'An unknown error occurred. Please try again.';
};

const Header: React.FC<{isProUser: boolean; onUpgradeClick: () => void; onGalleryClick: () => void}> = ({ isProUser, onUpgradeClick, onGalleryClick }) => (
  <header className="w-full max-w-7xl mx-auto flex items-center justify-between p-4 md:p-6">
    <div>
        <button onClick={onGalleryClick} className="flex items-center gap-2 bg-pink-500/20 text-pink-300 px-4 py-2 rounded-full font-semibold border border-pink-500/30 hover:bg-pink-500/30 transition-colors">
            <PhotoIcon className="w-5 h-5" />
            <span>My Creations</span>
        </button>
    </div>
    <div className="text-center">
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 text-transparent bg-clip-text">
        Toon-Nation 814
      </h1>
      <p className="text-gray-400 mt-2 text-base sm:text-lg">Transform your photos & videos with AI magic!</p>
    </div>
    <div>
        {!isProUser && (
            <button onClick={onUpgradeClick} className="hidden sm:flex items-center gap-2 bg-yellow-400/20 text-yellow-300 px-4 py-2 rounded-full font-semibold border border-yellow-400/30 hover:bg-yellow-400/30 transition-colors">
                <StarIcon className="w-5 h-5" />
                <span>Upgrade to Pro</span>
            </button>
        )}
    </div>
  </header>
);

const Footer: React.FC = () => (
    <footer className="w-full text-center p-4 mt-auto text-gray-500 text-sm">
        <p>&copy; {new Date().getFullYear()} Toon-Nation 814. All rights reserved.</p>
        <a href="/privacy-policy.html" target="_blank" rel="noopener noreferrer" className="underline hover:text-pink-500 transition-colors">
            Privacy Policy
        </a>
    </footer>
);

const CameraView: React.FC<{
  onCapture: (image: OriginalImage) => void;
  onClose: () => void;
}> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  useEffect(() => {
    let isMounted = true;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    setIsCameraReady(false);
    setError(null);

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera not supported on this browser.');
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
        if (isMounted && videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          videoRef.current.onloadedmetadata = () => {
            if (isMounted) setIsCameraReady(true);
          };
        } else {
            stream.getTracks().forEach(track => track.stop());
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        let message = 'Could not access the camera.';
        if (err instanceof Error) {
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                message = 'Camera permission denied. Please allow camera access in your browser settings.';
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError' || err.name === 'OverconstrainedError') {
                message = 'The requested camera is not available on this device.';
            }
        }
        if (isMounted) setError(message);
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  const handleCapture = useCallback(async () => {
    if (videoRef.current && canvasRef.current && isCameraReady) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      const MAX_SIZE = 1024;
      let { videoWidth: width, videoHeight: height } = video;
      if (width > height) {
        if (width > MAX_SIZE) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (context) {
        if (facingMode === 'user') {
          context.translate(width, 0);
          context.scale(-1, 1);
        }
        context.drawImage(video, 0, 0, width, height);
        
        canvas.toBlob(async (blob) => {
          if (blob) {
            try {
              const base64 = await blobToBase64(blob);
              onCapture({
                src: URL.createObjectURL(blob),
                base64,
                mimeType: blob.type,
              });
            } catch (err) {
              setError('Failed to process captured image.');
            }
          }
        }, 'image/jpeg', 0.9);
      }
    }
  }, [onCapture, isCameraReady, facingMode]);

  const handleSwitchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
      />
      <canvas ref={canvasRef} className="hidden" />
      
      {error && (
        <div className="absolute top-4 left-4 right-4 bg-red-500/80 text-white p-4 rounded-lg text-center">
          <p>{error}</p>
          <button onClick={onClose} className="mt-2 px-4 py-2 bg-red-700 rounded-md">Close</button>
        </div>
      )}

      {!isCameraReady && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-white text-lg animate-pulse">Starting Camera...</div>
          </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent flex justify-center items-center gap-8">
        <button
          onClick={onClose}
          className="absolute left-6 text-white bg-gray-500/50 p-3 rounded-full hover:bg-gray-500/80 transition-colors"
          aria-label="Close camera"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>
        
        <button
          onClick={handleCapture}
          disabled={!isCameraReady}
          className="w-20 h-20 bg-white rounded-full border-4 border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-pink-500 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Take picture"
        />

        <button
          onClick={handleSwitchCamera}
          className="absolute right-6 text-white bg-gray-500/50 p-3 rounded-full hover:bg-gray-500/80 transition-colors"
          aria-label="Switch camera"
        >
          <SwitchCameraIcon className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};


const ProModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl border border-pink-500/30 max-w-md w-full p-8 relative text-center shadow-2xl shadow-pink-500/10" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <XMarkIcon className="w-6 h-6" />
        </button>
        <div className="flex justify-center mb-4">
            <StarIcon className="w-16 h-16 text-yellow-400" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-3">Unlock Pro Features!</h2>
        <p className="text-gray-400 mb-6">Upgrade to Toon-Nation Pro to access exclusive styles, animations, and higher-quality exports.</p>
        <ul className="text-left text-gray-300 space-y-3 mb-8">
            <li className="flex items-center gap-3"><SparklesIcon className="w-6 h-6 text-pink-500" /> <strong>Exclusive "Ultra" Styles</strong></li>
            <li className="flex items-center gap-3"><FilmIcon className="w-6 h-6 text-pink-500" /> <strong>AI Video Animation</strong></li>
            <li className="flex items-center gap-3"><TicketIcon className="w-6 h-6 text-pink-500" /> <strong>Special Pop-Culture Styles</strong></li>
            <li className="flex items-center gap-3"><DownloadIcon className="w-6 h-6 text-pink-500" /> <strong>High-Resolution Downloads</strong></li>
        </ul>
        <button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 px-6 rounded-lg hover:opacity-90 transition-opacity transform hover:scale-105">
            Upgrade to Pro Now
        </button>
        <p className="text-xs text-gray-500 mt-4">This is a demo. No real payment required.</p>
      </div>
    </div>
  );
};

const GalleryModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    creations: Creation[];
    onDelete: (id: number) => void;
    onReEdit: (creation: Creation) => void;
}> = ({ isOpen, onClose, creations, onDelete, onReEdit }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-2xl border border-pink-500/30 max-w-4xl w-full h-[90vh] p-6 relative flex flex-col shadow-2xl shadow-pink-500/10" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-700">
                    <h2 className="text-3xl font-bold text-white">My Creations</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                
                {creations.length === 0 ? (
                    <div className="flex-grow flex flex-col items-center justify-center text-center text-gray-500">
                        <PhotoIcon className="w-24 h-24 mb-4" />
                        <h3 className="text-xl font-semibold">Your gallery is empty</h3>
                        <p>Save your toonified images to see them here!</p>
                    </div>
                ) : (
                    <div className="flex-grow overflow-y-auto pr-2">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {creations.map((creation) => (
                                <div key={creation.id} className="group relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-pink-500 transition-all">
                                    <img src={`data:image/png;base64,${creation.toonifiedImageBase64}`} alt="Toonified creation" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 gap-2">
                                        <button onClick={() => onReEdit(creation)} className="flex items-center gap-2 bg-blue-500 text-white px-3 py-1.5 rounded-md text-sm hover:bg-blue-600 transition-colors">
                                            <PencilSquareIcon className="w-4 h-4" />
                                            <span>Edit</span>
                                        </button>
                                        <button onClick={() => creation.id && onDelete(creation.id)} className="flex items-center gap-2 bg-red-500 text-white px-3 py-1.5 rounded-md text-sm hover:bg-red-600 transition-colors">
                                            <TrashIcon className="w-4 h-4" />
                                            <span>Delete</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const LoadingIndicator: React.FC<{ message: string; progress: number | null; isToonifying: boolean }> = ({ message, progress, isToonifying }) => {
    const showProgressBar = progress !== null || isToonifying;
    const isSimulated = isToonifying && progress === null;

    return (
        <div className="text-center flex flex-col items-center gap-6">
            <div className="relative w-24 h-24">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle className="ring ring-1" cx="50" cy="50" r="45" fill="none" />
                    <circle className="ring ring-2" cx="50" cy="50" r="45" fill="none" />
                    <circle className="ring ring-3" cx="50" cy="50" r="45" fill="none" />
                </svg>
            </div>
            <p className="text-xl font-semibold text-gray-300">{message}</p>
            {showProgressBar && (
                <div className={`w-64 bg-gray-700 rounded-full h-2.5 overflow-hidden ${isSimulated ? 'progress-bar-simulated' : ''}`}>
                    <div
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-2.5 rounded-full transition-width duration-500 ease-linear"
                        style={{ width: isSimulated ? '0%' : `${progress}%` }}
                    ></div>
                </div>
            )}
        </div>
    );
};

const App: React.FC = () => {
    const [appState, setAppState] = useState<AppState>('idle');
    const [appMode, setAppMode] = useState<AppMode>('toonify');
    const [originalImage, setOriginalImage] = useState<OriginalImage | null>(null);
    const [toonifiedImageHistory, setToonifiedImageHistory] = useState<string[]>([]);
    const [historyPointer, setHistoryPointer] = useState(0);
    const [finalMediaUrl, setFinalMediaUrl] = useState<string | null>(null);
    const [mediaType, setMediaType] = useState<MediaType>('image');
    const [caption, setCaption] = useState('');
    const [isProUser, setIsProUser] = useState(true); // Default to true for demo purposes
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isProModalOpen, setIsProModalOpen] = useState(false);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Toonifying your image...');
    const [animationProgress, setAnimationProgress] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [creations, setCreations] = useState<Creation[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    
    const [historyBeforeEditing, setHistoryBeforeEditing] = useState<string[]>([]);
    const [pointerBeforeEditing, setPointerBeforeEditing] = useState(0);

    const [selectedStyles, setSelectedStyles] = useState<ToonStyle[]>(['cartoon']);
    const [shotType, setShotType] = useState<ShotType>('full-body');
    const [intensity, setIntensity] = useState(50);
    const [faceFidelity, setFaceFidelity] = useState(50);
    const [advancedOptions, setAdvancedOptions] = useState({
        emotion: '',
        pose: '',
        outfit: '',
        background: '',
        lighting: '',
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const currentToonifiedImage = toonifiedImageHistory[historyPointer] || null;

    useEffect(() => {
        initDB().then(() => {
            loadCreations();
        });
    }, []);

    const loadCreations = async () => {
        const savedCreations = await getCreations();
        setCreations(savedCreations);
    };
    
    const handleImageUpload = useCallback(async (file: File) => {
        setIsUploading(true);
        try {
            const resizedBlob = await resizeImage(file, 1024);
            const base64 = await blobToBase64(resizedBlob);
            setOriginalImage({
                src: URL.createObjectURL(resizedBlob),
                base64,
                mimeType: resizedBlob.type,
            });
            setAppState('imageSelected');
        } catch (err) {
            setError('Could not process the image. Please try another one.');
            setAppState('error');
        } finally {
            setIsUploading(false);
        }
    }, []);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            handleImageUpload(file);
        }
    };
    
    const handleToonify = useCallback(async () => {
        if (!originalImage) return;

        setAppState('loading');
        setLoadingMessage('Toonifying your image...');
        setAnimationProgress(null);
        setError(null);
        setFinalMediaUrl(null);
        setMediaType('image');
        
        try {
            const generatedImage = await toonifyImage(
                originalImage.base64,
                originalImage.mimeType,
                selectedStyles,
                intensity,
                shotType,
                advancedOptions.emotion,
                advancedOptions.pose,
                advancedOptions.outfit,
                advancedOptions.background,
                advancedOptions.lighting,
                faceFidelity
            );
            setToonifiedImageHistory([generatedImage]);
            setHistoryPointer(0);
            setAppState('success');
            
            generateCaption(
                selectedStyles.map(s => ALL_STYLES_MAP[s].name), 
                advancedOptions.emotion, 
                advancedOptions.outfit
            ).then(setCaption);

        } catch (err) {
            console.error(err);
            setError(getFriendlyErrorMessage(err));
            setAppState('error');
        }
    }, [originalImage, selectedStyles, intensity, shotType, faceFidelity, advancedOptions]);

    const handleGenerateFromScratch = async (mainPrompt: string) => {
        if (!mainPrompt.trim()) return;
    
        setAppState('loading');
        setLoadingMessage('Bringing your idea to life...');
        setAnimationProgress(null);
        setError(null);
        setFinalMediaUrl(null);
        setMediaType('image');
        setOriginalImage(null); // No original image for text-to-image
    
        try {
            const generatedImage = await generateImageFromScratch(
                mainPrompt,
                selectedStyles,
                intensity,
                shotType,
                advancedOptions.emotion,
                advancedOptions.pose,
                advancedOptions.outfit,
                advancedOptions.background,
                advancedOptions.lighting
            );
            setToonifiedImageHistory([generatedImage]);
            setHistoryPointer(0);
            setAppState('success');
            
            setCaption(mainPrompt);
    
        } catch (err) {
            console.error(err);
            setError(getFriendlyErrorMessage(err));
            setAppState('error');
        }
    };

    const handleFaceSwap = async (source: OriginalImage, target: OriginalImage) => {
        setAppState('loading');
        setLoadingMessage('Performing AI face swap...');
        setAnimationProgress(null);
        setError(null);
        setFinalMediaUrl(null);
        setMediaType('faceSwapResult');

        try {
            const swappedImage = await faceSwapImage(
                source.base64,
                source.mimeType,
                target.base64,
                target.mimeType
            );
            setToonifiedImageHistory([swappedImage]);
            setHistoryPointer(0);
            setAppState('success');
            setCaption("The old switcheroo!");
        } catch (err) {
            console.error(err);
            setError(getFriendlyErrorMessage(err));
            setAppState('error');
        }
    };
    
    const handleAnimate = async (animationStyle: ToonStyle) => {
        if (!currentToonifiedImage) return;

        setAppState('loading');
        setLoadingMessage("Preparing animation...");
        setAnimationProgress(0);
        setError(null);
        setMediaType('video');
        
        try {
            const videoBlob = await animateImage(
                currentToonifiedImage,
                'image/png',
                animationStyle,
                (progress, message) => {
                    setAnimationProgress(progress);
                    setLoadingMessage(message);
                }
            );
            setFinalMediaUrl(URL.createObjectURL(videoBlob));
            setAppState('success');
        } catch (err) {
            console.error(err);
            const friendlyError = getFriendlyErrorMessage(err);
            setError(friendlyError);

            // Special handling for Veo API key issue as per guidelines
            if (err instanceof Error && err.message.toLowerCase().includes('requested entity was not found')) {
                if (window.aistudio?.openSelectKey) {
                    window.aistudio.openSelectKey();
                }
            }
            
            setAppState('error');
        }
    };

    const handleDownload = async (highDef: boolean = false) => {
        if (!currentToonifiedImage) return;
    
        if (!highDef) {
            const link = document.createElement('a');
            link.href = `data:image/png;base64,${currentToonifiedImage}`;
            link.download = 'toon-nation.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            return;
        }
    
        // HD Download logic
        if (!isProUser) {
            setIsProModalOpen(true);
            return;
        }
    
        setAppState('loading');
        setLoadingMessage('Upscaling to High-Definition...');
        setAnimationProgress(null); // Not animating
        setError(null);
    
        try {
            const hdImageBase64 = await upscaleImage(currentToonifiedImage, 'image/png');
            const link = document.createElement('a');
            link.href = `data:image/png;base64,${hdImageBase64}`;
            link.download = 'toon-nation-hd.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setAppState('success'); // Return to success view after download
        } catch (err) {
            console.error("HD Upscale Error:", err);
            setError(getFriendlyErrorMessage(err));
            setAppState('error');
        }
    };

    const handleSaveCreation = async () => {
        if (!originalImage || !currentToonifiedImage) return;
        await addCreation({
            originalImageBase64: originalImage.base64,
            originalImageMimeType: originalImage.mimeType,
            toonifiedImageBase64: currentToonifiedImage,
            caption: caption,
        });
        await loadCreations();
    };
    
    const handleDeleteCreation = async (id: number) => {
        await deleteCreation(id);
        await loadCreations();
    };
    
    const handleReEdit = (creation: Creation) => {
        setOriginalImage({
            src: `data:${creation.originalImageMimeType};base64,${creation.originalImageBase64}`,
            base64: creation.originalImageBase64,
            mimeType: creation.originalImageMimeType,
        });
        setToonifiedImageHistory([creation.toonifiedImageBase64]);
        setHistoryPointer(0);
        setCaption(creation.caption);
        setFinalMediaUrl(null);
        setMediaType('image');
        setAppState('success');
        setIsGalleryOpen(false);
    };

    const handleReset = () => {
        setAppState('idle');
        setAppMode('toonify');
        setOriginalImage(null);
        setToonifiedImageHistory([]);
        setHistoryPointer(0);
        setFinalMediaUrl(null);
        setError(null);
        setIsEditing(false);
    };

    // --- Editor Handlers ---
    const handleStartEditing = () => {
        setHistoryBeforeEditing([...toonifiedImageHistory]);
        setPointerBeforeEditing(historyPointer);
        setIsEditing(true);
    };

    const handleCancelEditing = () => {
        setToonifiedImageHistory(historyBeforeEditing);
        setHistoryPointer(pointerBeforeEditing);
        setIsEditing(false);
    };

    const handleDoneEditing = () => {
        const newHistory = toonifiedImageHistory.slice(0, historyPointer + 1);
        setToonifiedImageHistory(newHistory);
        setHistoryPointer(newHistory.length - 1);
        setIsEditing(false);
    };
    
    const handleUndo = () => {
        if (historyPointer > 0) {
            setHistoryPointer(prev => prev - 1);
        }
    };
    
    const handleRedo = () => {
        if (historyPointer < toonifiedImageHistory.length - 1) {
            setHistoryPointer(prev => prev + 1);
        }
    };
    
    const handleAIEdit = async (prompt: string) => {
        if (!currentToonifiedImage || !prompt) return;
        setAppState('loading');
        setLoadingMessage('Applying your magic touch...');
        setAnimationProgress(null);
        try {
            const editedImage = await editToonifiedImage(currentToonifiedImage, 'image/png', prompt);
            const newHistory = toonifiedImageHistory.slice(0, historyPointer + 1);
            newHistory.push(editedImage);
            setToonifiedImageHistory(newHistory);
            setHistoryPointer(newHistory.length - 1);
            setAppState('success');
        } catch (err) {
            console.error("AI Edit Error:", err);
            setError(getFriendlyErrorMessage(err));
            // This is important for the editor view
            if (isEditing) {
                setAppState('success'); 
            } else {
                setAppState('error');
            }
        }
    };
    
    const handleApplyFilter = async (filterValue: string) => {
        if (!currentToonifiedImage) return;
        setAppState('loading');
        setLoadingMessage('Applying filter...');
        setAnimationProgress(null);
        try {
            const filteredImage = await applyFilter(currentToonifiedImage, filterValue);
            const newHistory = toonifiedImageHistory.slice(0, historyPointer + 1);
            newHistory.push(filteredImage);
            setToonifiedImageHistory(newHistory);
            setHistoryPointer(newHistory.length - 1);
            setAppState('success');
        } catch (err) {
            console.error("Filter Error:", err);
            setError(getFriendlyErrorMessage(err));
            if (isEditing) {
                setAppState('success');
            } else {
                setAppState('error');
            }
        }
    };
    
    const Uploader: React.FC = () => (
        <div className="w-full max-w-lg text-center">
             {isUploading ? (
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-600 rounded-2xl p-12 text-center bg-gray-800/50 h-[244px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mb-4"></div>
                    <p className="text-lg font-semibold text-gray-300">Processing your image...</p>
                </div>
            ) : (
                <div
                    className="relative border-2 border-dashed border-gray-600 rounded-2xl p-12 text-center hover:border-pink-500 transition-colors cursor-pointer bg-gray-800/50"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
                    <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-semibold text-white">Drag & drop or click to upload</h3>
                    <p className="mt-1 text-sm text-gray-500">for Toonification</p>
                </div>
            )}
            <div className="flex items-center gap-4 mt-6 max-w-md mx-auto">
                <button
                    onClick={() => setIsCameraOpen(true)}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-500/20 text-blue-300 px-4 py-3 rounded-full font-semibold border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
                >
                    <CameraIcon className="w-6 h-6" />
                    <span>Camera</span>
                </button>
                <button
                    onClick={() => setAppMode('fromScratch')}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-500/20 text-green-300 px-4 py-3 rounded-full font-semibold border border-green-500/30 hover:bg-green-500/30 transition-colors"
                >
                    <PencilIcon className="w-6 h-6" />
                    <span>From Scratch</span>
                </button>
                <button
                    onClick={() => setAppMode('faceSwap')}
                    className="flex-1 flex items-center justify-center gap-2 bg-purple-500/20 text-purple-300 px-4 py-3 rounded-full font-semibold border border-purple-500/30 hover:bg-purple-500/30 transition-colors"
                >
                    <FaceSwapIcon className="w-6 h-6" />
                    <span>Face Swap</span>
                </button>
            </div>
        </div>
    );
    
    const FaceSwapView: React.FC = () => {
      const [sourceFace, setSourceFace] = useState<OriginalImage | null>(null);
      const [targetImage, setTargetImage] = useState<OriginalImage | null>(null);

      const handleUpload = async (file: File, type: 'source' | 'target') => {
        try {
            const resizedBlob = await resizeImage(file, 1024);
            const base64 = await blobToBase64(resizedBlob);
            const image = { src: URL.createObjectURL(resizedBlob), base64, mimeType: resizedBlob.type };
            if (type === 'source') setSourceFace(image);
            else setTargetImage(image);
        } catch (err) {
            setError('Could not process image. Please try another.');
            setAppState('error');
        }
      };

      const UploaderBox: React.FC<{
        image: OriginalImage | null,
        onUpload: (file: File) => void,
        title: string
      }> = ({ image, onUpload, title }) => {
        const inputRef = useRef<HTMLInputElement>(null);
        return (
            <div className="w-full flex-1" onClick={() => !image && inputRef.current?.click()}>
                <input type="file" ref={inputRef} onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} accept="image/*" className="hidden" />
                {!image ? (
                    <div className="h-full border-2 border-dashed border-gray-600 rounded-2xl p-8 flex flex-col items-center justify-center hover:border-pink-500 transition-colors cursor-pointer bg-gray-800/50">
                        <UploadIcon className="h-10 w-10 text-gray-400"/>
                        <p className="mt-2 text-md font-semibold text-white">{title}</p>
                        <p className="mt-1 text-xs text-gray-500">Upload an image</p>
                    </div>
                ) : (
                    <div className="relative aspect-square">
                        <img src={image.src} alt={title} className="w-full h-full object-cover rounded-2xl" />
                        <button onClick={() => title === 'Source Face' ? setSourceFace(null) : setTargetImage(null)} className="absolute top-2 right-2 bg-black/50 p-1.5 rounded-full text-white hover:bg-black/80">
                            <XMarkIcon className="w-5 h-5"/>
                        </button>
                    </div>
                )}
            </div>
        )
      };

      return (
        <div className="w-full max-w-2xl text-center">
            <h2 className="text-3xl font-bold mb-4">AI Face Swap</h2>
            <div className="flex flex-col sm:flex-row items-stretch gap-4 mb-6">
                <UploaderBox image={sourceFace} onUpload={(f) => handleUpload(f, 'source')} title="Source Face" />
                <div className="flex items-center justify-center text-pink-400">
                    <ArrowPathIcon className="w-8 h-8 sm:rotate-0 rotate-90"/>
                </div>
                <UploaderBox image={targetImage} onUpload={(f) => handleUpload(f, 'target')} title="Target Image" />
            </div>
            <button
                onClick={() => handleFaceSwap(sourceFace!, targetImage!)}
                disabled={!sourceFace || !targetImage}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-4 px-6 rounded-lg text-xl hover:opacity-90 transition-opacity transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
            >
                Swap Faces!
            </button>
            <button onClick={() => setAppMode('toonify')} className="mt-4 text-gray-400 hover:text-white">
                Back to Toonify
            </button>
        </div>
      )
    };
    
    const StyleSelectionUI: React.FC<{
        selectedStyles: ToonStyle[];
        handleStyleClick: (style: StyleDefinition) => void;
        shotType: ShotType;
        setShotType: (type: ShotType) => void;
    }> = ({ selectedStyles, handleStyleClick: passedHandleStyleClick, shotType, setShotType }) => {
        
        const handleStyleClick = (style: StyleDefinition) => {
            if (style.isPro && !isProUser) {
                setIsProModalOpen(true);
                return;
            }
            passedHandleStyleClick(style);
        };
        
        return (
            <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Choose Your Style(s)</h2>
                  <div className="flex items-center gap-1 bg-gray-800 p-1 rounded-full">
                      <button onClick={() => setShotType('full-body')} className={`shot-type-btn ${shotType === 'full-body' ? 'bg-pink-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>
                          <UserIcon className="w-5 h-5" />
                          <span>Full Body</span>
                      </button>
                      <button onClick={() => setShotType('head-shot')} className={`shot-type-btn ${shotType === 'head-shot' ? 'bg-pink-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>
                          <UserCircleIcon className="w-5 h-5" />
                          <span>Head Shot</span>
                      </button>
                  </div>
                </div>
                <div className="space-y-4 max-h-[60vh] lg:max-h-none overflow-y-auto pr-2">
                    {STYLE_CATEGORIES.map(cat => (
                        <div key={cat.name}>
                            <h3 className="font-semibold text-lg text-pink-400 mb-2">{cat.name}</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {cat.styles.map(style => (
                                    <div key={style.key} onClick={() => handleStyleClick(style)} className="cursor-pointer group relative">
                                        <img src={style.preview} alt={style.name} className={`w-full aspect-square object-cover rounded-lg border-4 transition-all ${selectedStyles.includes(style.key as ToonStyle) ? 'border-pink-500 scale-105' : 'border-transparent group-hover:border-pink-500/50'}`} />
                                        <p className="text-center text-sm mt-1 font-medium">{style.name}</p>
                                        {style.isPro && (
                                            <div className="absolute top-1 right-1 bg-yellow-400 text-gray-900 px-1.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                                                <StarIcon className="w-3 h-3" />
                                                PRO
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </>
        );
    };

    const StyleSelector: React.FC = () => {
        const handleStyleClick = (style: StyleDefinition) => {
            setSelectedStyles(prev => {
                const isSelected = prev.includes(style.key as ToonStyle);
                if (isSelected) {
                    return prev.length > 1 ? prev.filter(s => s !== style.key) : prev;
                } else {
                    return [...prev, style.key as ToonStyle].slice(-2);
                }
            });
        };

        return (
            <div className="w-full flex flex-col lg:flex-row gap-8">
                <div className="lg:w-1/3 flex-shrink-0">
                    <h2 className="text-2xl font-bold mb-4">Original Image</h2>
                    <img src={originalImage?.src} alt="Original" className="rounded-xl w-full" />
                </div>
                <div className="lg:w-2/3">
                    <StyleSelectionUI 
                        selectedStyles={selectedStyles}
                        handleStyleClick={handleStyleClick}
                        shotType={shotType}
                        setShotType={setShotType}
                    />
                    <button onClick={handleToonify} className="w-full mt-8 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-4 px-6 rounded-lg text-xl hover:opacity-90 transition-opacity transform hover:scale-105">
                        Toonify!
                    </button>
                </div>
            </div>
        );
    };

    const FromScratchView: React.FC = () => {
        const [mainPrompt, setMainPrompt] = useState('');
    
        const handleStyleClick = (style: StyleDefinition) => {
            setSelectedStyles(prev => {
                const isSelected = prev.includes(style.key as ToonStyle);
                if (isSelected) {
                    return prev.length > 1 ? prev.filter(s => s !== style.key) : prev;
                } else {
                    return [...prev, style.key as ToonStyle].slice(-2);
                }
            });
        };
    
        return (
            <div className="w-full max-w-4xl">
                <h2 className="text-3xl font-bold text-center mb-2">Create from Scratch</h2>
                <p className="text-gray-400 text-center mb-6">Describe the character you want to create, pick your styles, and let the AI bring it to life.</p>
                
                <textarea
                    value={mainPrompt}
                    onChange={(e) => setMainPrompt(e.target.value)}
                    placeholder="e.g., A steampunk robot inventor with glowing blue eyes, wearing a leather apron and holding a complex gadget."
                    className="w-full bg-gray-800 border-2 border-gray-700 rounded-lg p-4 mb-6 text-lg focus:ring-2 focus:ring-pink-500 focus:outline-none focus:border-pink-500 transition-colors"
                    rows={3}
                />
    
                <StyleSelectionUI 
                    selectedStyles={selectedStyles}
                    handleStyleClick={handleStyleClick}
                    shotType={shotType}
                    setShotType={setShotType}
                />
    
                <button 
                    onClick={() => handleGenerateFromScratch(mainPrompt)}
                    disabled={!mainPrompt.trim()}
                    className="w-full mt-8 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-4 px-6 rounded-lg text-xl hover:opacity-90 transition-opacity transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Generate!
                </button>
                 <button onClick={() => setAppMode('toonify')} className="block mx-auto mt-4 text-gray-400 hover:text-white">
                    Back to Toonify
                </button>
            </div>
        );
    };
    
    const SuccessView: React.FC = () => (
      <div className="w-full max-w-4xl text-center">
          <div className="relative aspect-square max-w-lg mx-auto">
              {(mediaType === 'image' || mediaType === 'faceSwapResult') && currentToonifiedImage && (
                  <img src={`data:image/png;base64,${currentToonifiedImage}`} alt="Toonified result" className="rounded-xl w-full" />
              )}
              {mediaType === 'video' && finalMediaUrl && (
                  <video src={finalMediaUrl} controls autoPlay loop className="rounded-xl w-full" />
              )}
          </div>
          <p className="mt-4 text-lg text-gray-300 italic">"{caption}"</p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
              <button onClick={() => handleDownload(false)} className="action-btn bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30"><DownloadIcon className="w-5 h-5" /> Download</button>
              <button onClick={() => handleDownload(true)} className="action-btn bg-yellow-400/20 text-yellow-300 border-yellow-400/30 hover:bg-yellow-400/30"><StarIcon className="w-5 h-5" /> HD Download</button>
              <button onClick={handleReset} className="action-btn bg-gray-500/20 text-gray-300 border-gray-500/30 hover:bg-gray-500/30"><ArrowPathIcon className="w-5 h-5" /> Start Over</button>
              {mediaType !== 'faceSwapResult' && (
                <>
                  <button onClick={handleStartEditing} className="action-btn bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30"><PaintBrushIcon className="w-5 h-5" /> Edit</button>
                  {originalImage && <button onClick={() => handleSaveCreation()} className="action-btn bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30"><BookmarkSquareIcon className="w-5 h-5" /> Save</button>}
                  <button onClick={() => handleAnimate('subtleAnimation')} className="action-btn bg-pink-500/20 text-pink-300 border-pink-500/30 hover:bg-pink-500/30"><FilmIcon className="w-5 h-5" /> Animate</button>
                </>
              )}
          </div>
      </div>
    );

    const EditorView: React.FC = () => {
        const [prompt, setPrompt] = useState('');
        
        const handleSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            handleAIEdit(prompt);
            setPrompt('');
        };
        
        const handleSuggestionClick = (suggestion: string) => {
            setPrompt(suggestion);
            handleAIEdit(suggestion);
            setPrompt('');
        };

        const canUndo = historyPointer > 0;
        const canRedo = historyPointer < toonifiedImageHistory.length - 1;

        return (
            <div className="w-full max-w-7xl flex flex-col lg:flex-row gap-8">
                <div className="lg:w-1/2 flex flex-col items-center gap-4">
                    <div className="relative aspect-square w-full max-w-lg">
                        {currentToonifiedImage && <img src={`data:image/png;base64,${currentToonifiedImage}`} alt="Editing result" className="rounded-xl w-full" />}
                    </div>
                     <div className="flex items-center gap-4">
                        <button onClick={handleUndo} disabled={!canUndo} className="edit-action-btn disabled:opacity-50 disabled:cursor-not-allowed">
                            <ArrowUturnLeftIcon className="w-6 h-6"/><span>Undo</span>
                        </button>
                        <button onClick={handleRedo} disabled={!canRedo} className="edit-action-btn disabled:opacity-50 disabled:cursor-not-allowed">
                           <ArrowUturnRightIcon className="w-6 h-6"/><span>Redo</span>
                        </button>
                    </div>
                </div>
                <div className="lg:w-1/2 flex flex-col gap-6">
                    <div>
                        <h2 className="text-2xl font-bold mb-3 text-pink-400">AI-Powered Editing</h2>
                        <form onSubmit={handleSubmit} className="flex gap-2">
                            <input
                                type="text"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="e.g., add a space helmet"
                                className="flex-grow bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:ring-2 focus:ring-pink-500 focus:outline-none"
                            />
                            <button type="submit" className="flex items-center gap-2 bg-pink-500 text-white font-semibold px-4 py-3 rounded-lg hover:bg-pink-600 transition-colors">
                                <SparklesIcon className="w-5 h-5"/><span>Apply</span>
                            </button>
                        </form>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold mb-2 text-gray-300">Need inspiration?</h3>
                        <div className="flex flex-wrap gap-2">
                            {EDIT_SUGGESTIONS.slice(0, 6).map(suggestion => (
                                <button key={suggestion} onClick={() => handleSuggestionClick(suggestion)} className="bg-gray-700/80 text-gray-300 text-sm px-3 py-1.5 rounded-full hover:bg-gray-600 transition-colors">
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold mb-3 text-pink-400">Filters</h2>
                        <div className="flex flex-wrap gap-3">
                            <button onClick={() => handleApplyFilter('none')} className="bg-gray-700/80 text-gray-300 text-sm px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">None</button>
                            <button onClick={() => handleApplyFilter('sepia(100%)')} className="bg-gray-700/80 text-gray-300 text-sm px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">Sepia</button>
                            <button onClick={() => handleApplyFilter('grayscale(100%)')} className="bg-gray-700/80 text-gray-300 text-sm px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">Grayscale</button>
                            <button onClick={() => handleApplyFilter('invert(100%)')} className="bg-gray-700/80 text-gray-300 text-sm px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">Invert</button>
                        </div>
                    </div>
                    
                    <div>
                        <h2 className="text-2xl font-bold mb-3 text-pink-400 flex items-center gap-2">
                            <FaceSmileIcon className="w-6 h-6" />
                            <span>Funny Filters</span>
                        </h2>
                        <div className="flex flex-wrap gap-3">
                            <button onClick={() => handleApplyFilter('hue-rotate(180deg) saturate(250%) contrast(120%)')} className="bg-gray-700/80 text-gray-300 text-sm px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">Psychedelic</button>
                            <button onClick={() => handleApplyFilter('sepia(60%) saturate(200%) contrast(150%) brightness(90%)')} className="bg-gray-700/80 text-gray-300 text-sm px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">Toasty</button>
                            <button onClick={() => handleApplyFilter('saturate(500%) contrast(200%) brightness(80%)')} className="bg-gray-700/80 text-gray-300 text-sm px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">Deep Fried</button>
                            <button onClick={() => handleApplyFilter('invert(100%) grayscale(100%) contrast(200%)')} className="bg-gray-700/80 text-gray-300 text-sm px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">X-Ray</button>
                            <button onClick={() => handleApplyFilter('hue-rotate(90deg) saturate(150%)')} className="bg-gray-700/80 text-gray-300 text-sm px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">Alien</button>
                        </div>
                    </div>

                    <div className="flex-grow" />
                    <div className="flex justify-end gap-4 mt-auto pt-6 border-t border-gray-700">
                        <button onClick={handleCancelEditing} className="edit-action-btn bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30">
                            <XMarkIcon className="w-5 h-5"/><span>Cancel</span>
                        </button>
                        <button onClick={handleDoneEditing} className="edit-action-btn bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30">
                           <CheckIcon className="w-5 h-5"/><span>Done</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const ErrorView: React.FC = () => (
        <div className="text-center bg-red-500/10 border border-red-500/30 p-8 rounded-2xl max-w-lg">
            <FaceFrownIcon className="mx-auto h-16 w-16 text-red-400" />
            <h2 className="mt-4 text-2xl font-bold text-white">Oops! Something went wrong.</h2>
            <p className="mt-2 text-red-300">{error}</p>
            <button onClick={handleReset} className="mt-6 bg-red-500 text-white font-semibold py-2 px-6 rounded-lg hover:bg-red-600 transition-colors">
                Try Again
            </button>
        </div>
    );
    
    const renderContent = () => {
        if (appState === 'loading') return null;
        if (appState === 'error') return <ErrorView />;
        if (appState === 'success' && isEditing) return <EditorView />;
        if (appState === 'success' && !isEditing) return <SuccessView />;
        if (appState === 'imageSelected') return <StyleSelector />;
        if (appMode === 'fromScratch') return <FromScratchView />;
        if (appMode === 'faceSwap') return <FaceSwapView />;
        return <Uploader />;
    };

    const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
        e.preventDefault();
        if (appState === 'idle') {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent<HTMLElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLElement>) => {
        e.preventDefault();
        setIsDragging(false);
        if (appState === 'idle') {
            const file = e.dataTransfer.files?.[0];
            if (file && file.type.startsWith('image/')) {
                handleImageUpload(file);
            }
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center relative">
            <Header isProUser={isProUser} onUpgradeClick={() => setIsProModalOpen(true)} onGalleryClick={() => setIsGalleryOpen(true)} />

            <main 
                className="w-full max-w-7xl mx-auto p-4 md:p-6 flex-grow flex flex-col items-center justify-center"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {renderContent()}
            </main>

            {appState === 'loading' && (
                <div className="absolute inset-0 bg-gray-900/90 backdrop-blur-sm flex flex-col items-center justify-center z-40 transition-opacity">
                    <LoadingIndicator 
                        message={loadingMessage} 
                        progress={animationProgress} 
                        isToonifying={animationProgress === null}
                    />
                </div>
            )}
            
            {isDragging && (
                <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50 pointer-events-none">
                    <div className="text-center text-white border-4 border-dashed border-pink-500 rounded-3xl p-16">
                        <UploadIcon className="mx-auto h-24 w-24 text-pink-400 animate-pulse" />
                        <h2 className="mt-6 text-3xl font-bold">Drop your image here</h2>
                    </div>
                </div>
            )}

            {isCameraOpen && <CameraView onClose={() => setIsCameraOpen(false)} onCapture={(image) => { setOriginalImage(image); setAppState('imageSelected'); setIsCameraOpen(false); }} />}
            <ProModal isOpen={isProModalOpen} onClose={() => setIsProModalOpen(false)} />
            <GalleryModal 
                isOpen={isGalleryOpen} 
                onClose={() => setIsGalleryOpen(false)} 
                creations={creations}
                onDelete={handleDeleteCreation}
                onReEdit={handleReEdit}
            />
            
            <Footer />
        </div>
    );
};

export default App;