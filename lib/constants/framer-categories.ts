export interface FramerCategory {
    id: string;
    name: string;
    color?: string;
}

export const FRAMER_LOCKED_CATEGORY_ID = 'framer-blog';

export const FRAMER_CATEGORIES: FramerCategory[] = [
    { id: 'framer-blog', name: 'Blog', color: 'bg-violet-100 text-violet-700 border-violet-200' },
    { id: 'computer-vision', name: 'Computer Vision' },
    { id: 'voice-ai', name: 'Voice AI' },
    { id: 'general', name: 'General' },
    { id: 'ai-assistant', name: 'AI Assistant' },
    { id: 'idr', name: 'IDR' },
    { id: 'case-studies', name: 'Case studies' },
    { id: 'vision-ai', name: 'Vision AI' },
    { id: '10xclassify', name: '10xClassify', color: 'bg-violet-100 text-violet-700 border-violet-200' }
];
