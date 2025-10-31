
import { GoogleGenAI, Modality, Operation } from '@google/genai';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}

export type StyleDefinition = {
  key: string;
  name: string;
  description: string;
  preview: string;
  isPro?: boolean;
};

export type StyleCategory = {
  name: string;
  icon: 'FilmIcon' | 'PaletteIcon' | 'GameControllerIcon' | 'TicketIcon' | 'FaceFrownIcon' | 'VideoCameraIcon' | 'SparklesIcon';
  styles: StyleDefinition[];
};

const promptTemplate = (options: {
    styles: string[];
    shotType: string;
    intensity: string;
    faceFidelity: string;
    emotion?: string;
    pose?: string;
    outfit?: string;
    background?: string;
    lighting?: string;
  }) => {
    const { styles, shotType, intensity, faceFidelity, emotion, pose, outfit, background, lighting } = options;
  
    const styleString = styles.length > 0 ? `Create a portrait of the person in the image in a blended style of: ${styles.join(' × ')}.` : 'Create a portrait of the person in the image.';

    const prompt = `${styleString}
  
  **//-- CORE INSTRUCTIONS --//**
  - **Character Consistency (Toon-ID):** ${faceFidelity}
  - **Outfit:** Recreate their outfit from the photo. If a new outfit is specified below, use that instead. Sneakers must always look brand-new.
  - **Proportions:** Use tall, realistic proportions unless a style specifies otherwise.
  - **Quality (EdgeClean AI):** Line art must be extremely crisp and clean. Automatically sharpen lines and remove any background noise or artifacts. The sclera (the white part of the eye) should be clean and bright. Critically, render eyes with natural-looking iris and pupil detail, avoiding solid black or unnaturally colored eyes unless the style itself demands it (e.g., vintage cartoon).
  
  **//-- STYLIZATION PARAMETERS --//**
  - **Shot Type:** ${shotType}
  - **Intensity:** ${intensity}
${emotion ? `- **Emotion / Facial Expression:** ${emotion}` : ''}
${pose ? `- **Pose / Stance:** ${pose}` : ''}
${outfit ? `- **New Outfit:** ${outfit}` : ''}
${background ? `- **Background World:** ${background}` : ''}
${lighting ? `- **Lighting FX:** ${lighting}` : ''}
  
  **//-- OUTPUT REQUIREMENTS --//**
  - **Format:** Deliver a single PNG file with a transparent background.
  - **Composition:** ${shotType === 'head-shot' ? 'A tight head-and-shoulders shot.' : 'Full-body if possible, otherwise a tight waist-up shot.'}
  - **Aspect Ratio:** 1:1.
  - **Resolution:** ~2048x2048px.
  - **Negative Constraints:** No text, watermarks, signatures, or logos.
  `;
    return prompt.replace(/^\s*\n/gm, ''); // clean up empty lines
  };

const scratchPromptTemplate = (options: {
    styles: string[];
    shotType: string;
    intensity: string;
    emotion?: string;
    pose?: string;
    outfit?: string;
    background?: string;
    lighting?: string;
    mainPrompt: string;
}) => {
    const { styles, shotType, intensity, emotion, pose, outfit, background, lighting, mainPrompt } = options;

    const styleString = styles.length > 0 ? ` in a blended style of: ${styles.join(' × ')}` : '';

    const prompt = `Create a character portrait of ${mainPrompt}${styleString}.

**//-- CORE INSTRUCTIONS --//**
- **Outfit:** If an outfit is specified below, use that. Sneakers must always look brand-new.
- **Proportions:** Use tall, realistic proportions unless a style specifies otherwise.
- **Quality (EdgeClean AI):** Line art must be extremely crisp and clean. Automatically sharpen lines and remove any background noise or artifacts. The whites of the eyes must be perfectly clean and bright.

**//-- STYLIZATION PARAMETERS --//**
- **Shot Type:** ${shotType}
- **Intensity:** ${intensity}
${emotion ? `- **Emotion / Facial Expression:** ${emotion}` : ''}
${pose ? `- **Pose / Stance:** ${pose}` : ''}
${outfit ? `- **Outfit:** ${outfit}` : ''}
${background ? `- **Background World:** ${background}` : ''}
${lighting ? `- **Lighting FX:** ${lighting}` : ''}

**//-- OUTPUT REQUIREMENTS --//**
- **Format:** Deliver a single PNG file with a transparent background.
- **Composition:** Full-body if possible, otherwise a tight waist-up shot.
- **Aspect Ratio:** 1:1.
- **Resolution:** ~2048x2048px.
- **Negative Constraints:** No text, watermarks, signatures, or logos.
`;
    return prompt.replace(/^\s*\n/gm, ''); // clean up empty lines
};


export const STYLE_CATEGORIES: StyleCategory[] = [
  {
    name: 'Animation & Cartoon',
    icon: 'FilmIcon',
    styles: [
      { key: 'cartoon', name: 'Vibrant Cartoon', description: 'Bold outlines and bright, flat colors for a modern animated look.', preview: 'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Vibrant_Cartoon.png'},
      { key: 'shonen', name: 'Shōnen Anime', description: 'Clean cel-shading and motion-line action, inspired by series like Dragon Ball & Naruto.', preview: 'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Dragon_Ball_Z.png'},
      { key: 'seinen', name: 'Seinen Anime', description: 'Gritty ink, realistic anatomy, and heavy contrast, inspired by series like Attack on Titan.', preview: 'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Pencil_Sketch.png'},
      { key: 'shojo', name: 'Shōjo Anime', description: 'Softer palette and delicate lighting for romance, inspired by series like Sailor Moon.', preview: 'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Watercolor.png'},
      { key: 'anime3d', name: 'Modern 3D Anime', description: 'Crisp toon-shader depth and realistic materials for a CGI hybrid look.', preview: 'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/3D_Render.png'},
      { key: 'vintageCartoon', name: 'Vintage Cartoon', description: '1930s style with rubber hose limbs and pie eyes in black & white.', preview: 'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Vintage_Cartoon.png'},
      { key: 'render3d', name: '3D Render', description: 'A polished, cinematic look with soft lighting and detailed textures.', preview: 'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/3D_Render.png'},
      { key: 'pixarRender', name: 'Pixar-style 3D Render', description: 'Iconic, family-friendly style with expressive, stylized features.', preview: 'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Pixar-style_3D_Render.png'},
      { key: 'claymation', name: 'Claymation', description: 'Hand-crafted, stop-motion look with visible fingerprints.', preview: 'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Claymation.png' },
      { key: 'chibi', name: 'Chibi', description: 'Cute, super-deformed style with a large head and small body.', preview: 'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Chibi.png'},
    ]
  },
   {
    name: 'Artistic & Abstract',
    icon: 'PaletteIcon',
    styles: [
      { key: 'watercolor', name: 'Watercolor', description: 'Soft, blended colors with a gentle, hand-painted texture.', preview: 'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Watercolor.png' },
      { key: 'bronzeSculpture', name: 'Bronze Sculpture', description: 'A powerful, classic look with a metallic sheen.', preview: 'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Bronze_Sculpture.png' },
      { key: 'popArt', name: 'Pop Art', description: 'Bold, graphic style with halftone dots and vibrant colors.', preview: 'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Pop_Art.png' },
      { key: 'stickerArt', name: 'Sticker Art', description: 'Glossy, die-cut sticker effect with a thick white border.', preview: 'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Sticker_Art.png' },
      { key: 'graffitiArt', name: 'Graffiti Art', description: 'Bold, spray-painted look with drips and vibrant colors.', preview: 'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Graffiti_Art.png' },
      { key: 'ukiyoE', name: 'Ukiyo-e', description: 'Japanese woodblock print style with flowing lines.', preview: 'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Ukiyo-e.png' },
      { key: 'artDeco', name: 'Art Deco', description: 'Elegant, geometric style from the 1920s with bold lines.', preview: 'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Art_Deco.png' },
      { key: 'paperCutout', name: 'Paper Cutout', description: 'A charming, layered papercraft look with visible depth.', preview: 'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Paper_Cutout.png' },
      { key: 'hologram', name: 'Hologram', description: 'A glowing, semi-transparent futuristic hologram effect.', preview: 'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Hologram.png' },
      { key: 'tribalArt', name: 'Tribal Art', description: 'Bold, symbolic patterns and earthy tones inspired by indigenous art.', preview: 'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Tribal_Art.png' },
    ]
  },
  {
    name: 'Gaming & Digital Art',
    icon: 'GameControllerIcon',
    styles: [
      { key: 'pixelArt', name: 'Pixel Art', description: 'Retro 8-bit or 16-bit video game aesthetic.', preview: 'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Pixel_Art.png' },
      { key: 'lowPoly', name: 'Low Poly', description: 'A stylized, faceted look from early 3D video games.', preview: 'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Low_Poly.png' },
      { key: 'glitchArt', name: 'Glitch Art', description: 'A distorted, digital error effect for a futuristic vibe.', preview: 'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Glitch_Art.png' },
    ]
  },
  {
    name: 'Pop Culture & Comics (Pro)',
    icon: 'TicketIcon',
    styles: [
        { key: 'marvel', name: 'Marvel Comic', description: `Dynamic "Kirby" energy with high-contrast inks.`, preview: 'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Marvel_Comic.png', isPro: true },
        { key: 'dc', name: 'DC Comic', description: `A modern, gritty comic style with cinematic lighting.`, preview: 'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/DC_Comic.png', isPro: true },
        { key: 'simpsons', name: 'The Simpsons', description: `The iconic Springfield look with an overbite.`, preview: 'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/The_Simpsons.png', isPro: true },
        { key: 'ghibli', name: 'Studio Ghibli', description: `The enchanting, hand-painted anime style.`, preview: 'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Studio_Ghibli.png', isPro: true },
        { key: 'southPark', name: 'South Park', description: `The classic, construction-paper cutout look.`, preview: 'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/South_Park.png', isPro: true },
        { key: 'burton', name: 'Tim Burton Style', description: `A spooky, gothic look with exaggerated features.`, preview: 'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Tim_Burton_Style.png', isPro: true },
        { key: 'futurama', name: 'Futurama Style', description: `Retro-futuristic "Bender" cartoon style.`, preview: 'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Futurama_Style.png', isPro: true },
    ]
  },
  {
      name: 'Animation Styles (Pro)',
      icon: 'VideoCameraIcon',
      styles: [
          { key: 'subtleAnimation', name: 'Subtle Animation', description: 'Gentle, looping motions like breathing or hair blowing.', preview: 'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Subtle_Animation.png', isPro: true },
          { key: 'characterLoop', name: 'Character Loop', description: 'A short, repeating animation of a simple action.', preview: 'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Character_Loop.png', isPro: true },
      ]
  }
];

export const ALL_STYLES: StyleDefinition[] = STYLE_CATEGORIES.flatMap(cat => cat.styles);

export const ALL_STYLES_MAP: { [key: string]: StyleDefinition } = ALL_STYLES.reduce((acc, style) => {
    acc[style.key] = style;
    return acc;
}, {} as { [key: string]: StyleDefinition });

export type ToonStyle = typeof ALL_STYLES[number]['key'];

const getAi = () => {
    return new GoogleGenAI({ apiKey: process.env.API_KEY as string });
}

const checkApiKey = async () => {
    if (!window.aistudio) return;
    try {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
            await window.aistudio.openSelectKey();
        }
    } catch (e) {
        console.error("Could not verify API key", e);
    }
}

const extractBase64 = (response: any): string => {
    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            return part.inlineData.data;
        }
    }
    throw new Error('No image was generated by the AI.');
}

export const toonifyImage = async (
    base64: string,
    mimeType: string,
    styles: ToonStyle[],
    intensity: number,
    shotType: 'full-body' | 'head-shot',
    emotion: string,
    pose: string,
    outfit: string,
    background: string,
    lighting: string,
    faceFidelity: number
): Promise<string> => {
    const ai = getAi();
    const imagePart = { inlineData: { mimeType, data: base64 } };
    const styleNames = styles.map(s => ALL_STYLES_MAP[s]?.name || s);
    const textPart = { text: promptTemplate({ 
        styles: styleNames,
        shotType,
        intensity: `${intensity}%`,
        faceFidelity: `${faceFidelity}%`,
        emotion, pose, outfit, background, lighting,
    })};

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [imagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    return extractBase64(response);
};

export const editToonifiedImage = async (
    base64: string,
    mimeType: string,
    prompt: string
): Promise<string> => {
    const ai = getAi();
    const imagePart = { inlineData: { mimeType, data: base64 } };
    const textPart = { text: prompt };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [imagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    return extractBase64(response);
}

export const generateImageFromScratch = async (
    mainPrompt: string,
    styles: ToonStyle[],
    intensity: number,
    shotType: 'full-body' | 'head-shot',
    emotion: string,
    pose: string,
    outfit: string,
    background: string,
    lighting: string,
): Promise<string> => {
    const ai = getAi();
    const styleNames = styles.map(s => ALL_STYLES_MAP[s]?.name || s);
    
    const textPart = { text: scratchPromptTemplate({ 
        mainPrompt,
        styles: styleNames,
        shotType,
        intensity: `${intensity}%`,
        emotion, pose, outfit, background, lighting,
    })};

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: [{ parts: [textPart] }],
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    return extractBase64(response);
};

export const generateCaption = async (styles: string[], emotion: string, outfit: string): Promise<string> => {
    const ai = getAi();
    let prompt = `Generate a short, fun, and witty caption for a cartoon image. The style is a mix of ${styles.join(' and ')}.`;
    if (emotion) prompt += ` The character has a ${emotion} expression.`;
    if (outfit) prompt += ` They are wearing ${outfit}.`;
    prompt += ` The caption should be one sentence and enclosed in quotes.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return response.text.replace(/"/g, ''); // Remove quotes from the response
}

export const animateImage = async (
    base64: string,
    mimeType: string,
    animationStyle: ToonStyle,
    onProgress: (progress: number, message: string) => void
): Promise<Blob> => {
    await checkApiKey();
    const ai = getAi();

    const styleName = ALL_STYLES_MAP[animationStyle]?.name || 'subtle';

    onProgress(10, 'Warming up the animation engine...');
    
    // Using Veo for video generation
    let operation: Operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: `Create a short, looping animation of this character. The style of animation should be ${styleName}.`,
        image: { imageBytes: base64, mimeType },
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: '1:1'
        }
    });

    onProgress(20, 'Casting the animation spell...');

    const loadingMessages = [
        "Rendering frames...",
        "Compositing layers...",
        "Applying AI magic...",
        "This can take a few minutes...",
        "Almost there...",
        "Adding final touches..."
    ];
    let messageIndex = 0;

    let checks = 0;
    const maxChecks = 30; // 30 checks * 10s = 5 minutes timeout
    while (!operation.done) {
        if (checks >= maxChecks) {
            throw new Error("Video generation timed out. Please try again.");
        }
        await new Promise(resolve => setTimeout(resolve, 10000)); // Check every 10 seconds as per guidelines
        checks++;
        
        // More gradual progress that doesn't get stuck at 90
        const progress = 20 + Math.floor((checks / maxChecks) * 75); 
        
        // Cycle through loading messages
        if (checks % 3 === 0) { // change message every 30s
            messageIndex = (messageIndex + 1) % loadingMessages.length;
        }

        onProgress(Math.min(progress, 95), loadingMessages[messageIndex]);
        operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    onProgress(98, 'Finalizing video...');

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
        throw new Error('Video generation failed to produce a download link.');
    }

    const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!videoResponse.ok) {
        throw new Error(`Failed to download the generated video. Status: ${videoResponse.status}`);
    }

    onProgress(100, 'Done!');
    return videoResponse.blob();
}

export const faceSwapImage = async (
    sourceImageBase64: string,
    sourceImageMimeType: string,
    targetImageBase64: string,
    targetImageMimeType: string,
): Promise<string> => {
    const ai = getAi();
    
    const sourceImagePart = {
        inlineData: {
            mimeType: sourceImageMimeType,
            data: sourceImageBase64,
        },
    };

    const targetImagePart = {
        inlineData: {
            mimeType: targetImageMimeType,
            data: targetImageBase64,
        },
    };
    
    const textPart = {
        text: `Take the face from the second image (the source face) and seamlessly place it onto the person in the first image (the target image).

**//-- INSTRUCTIONS --//**
1.  **Identify:** Accurately identify the primary face in the second image (the source).
2.  **Transfer:** Transplant this face onto the body/head of the person in the first image (the target).
3.  **Blend:** Ensure the skin tones, lighting, and angles match the target image for a natural and believable result.
4.  **Preserve:** Keep the background, body, hair, and clothing of the first image (the target) intact. Only the face should be replaced.
5.  **Output:** Provide only the final, edited image. Do not include any text or explanations. The final image should look like the first image, but with the face from the second image.`,
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            // The first image should be the one to be edited (the target).
            parts: [targetImagePart, sourceImagePart, textPart],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    return extractBase64(response);
};

export const upscaleImage = async (base64: string, mimeType: string): Promise<string> => {
    const ai = getAi();
    const imagePart = { inlineData: { mimeType, data: base64 } };
    const textPart = {
        text: `Upscale this image to a high resolution (e.g., 4096x4096px). Sharpen all details, enhance textures, and ensure lines are crisp and clean using EdgeClean AI. It is critical to perfectly preserve the original art style, character features, and colors. Do not alter the composition or add new elements. The output should be a single, high-quality PNG file with a transparent background.`
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [imagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    return extractBase64(response);
}
