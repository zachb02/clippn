import type { Icon } from "@phosphor-icons/react";
import {
  Lightbulb,
  Image,
  Palette,
  UserSquare,
  MicrophoneStage,
  Faders,
  SpeakerHigh,
  MusicNotes,
  FaceMask,
  Cube,
  ClosedCaptioning,
  VideoCamera,
  Scissors,
  Crop,
  FileZip,
  Waveform,
  ArrowsCounterClockwise,
  FileAudio,
  MagnifyingGlass,
  CloudArrowDown,
} from "@phosphor-icons/react/dist/ssr";

export type ToolEntry = {
  slug?: string;
  label: string;
  description: string;
  icon: Icon;
  requiresKey: boolean;
};

export const AI_TOOLS: ToolEntry[] = [
  {
    label: "Content Brainstorm",
    description:
      "Generate hooks, angles, outlines, and titles from a single topic or a pasted transcript.",
    icon: Lightbulb,
    requiresKey: true,
  },
  {
    label: "AI Image Generator",
    description:
      "Create original thumbnails, backgrounds, and scene visuals from a text prompt.",
    icon: Image,
    requiresKey: true,
  },
  {
    label: "AI Image Editor",
    description:
      "Make conversational edits to an existing image — remove objects, change a background, restyle a frame.",
    icon: Palette,
    requiresKey: true,
  },
  {
    label: "Icon / Avatar Generator",
    description:
      "Produce channel icons and stylized avatars for faceless or branded projects.",
    icon: UserSquare,
    requiresKey: true,
  },
  {
    label: "AI Voiceover",
    description:
      "Turn a script into narration with selectable voices, pacing, and emphasis controls.",
    icon: MicrophoneStage,
    requiresKey: true,
  },
  {
    label: "Voice Changer",
    description:
      "Apply generic, non-identifying voice presets to a recording — pitch, tone, and texture, not impersonation.",
    icon: Faders,
    requiresKey: true,
  },
  {
    label: "Vocal / Instrumental Separator",
    description:
      "Split a mixed track into vocal and instrumental stems for remixing, ducking, or subtitle alignment.",
    icon: MusicNotes,
    requiresKey: true,
  },
  {
    label: "Face Swap",
    description:
      "Consent-gated likeness editing — requires an explicit ownership/permission attestation before it runs.",
    icon: FaceMask,
    requiresKey: true,
  },
  {
    label: "Background Remover",
    description:
      "Isolate a subject from its background for overlays, green-screen-style composites, and cutouts.",
    icon: Cube,
    requiresKey: true,
  },
  {
    label: "Subtitle Remover",
    description:
      "Detect and erase burned-in captions from source footage so you can restyle and re-burn your own.",
    icon: ClosedCaptioning,
    requiresKey: true,
  },
  {
    label: "AI Video Tool",
    description:
      "Capability-gated video generation for providers that support it, surfaced only when your connection allows it.",
    icon: VideoCamera,
    requiresKey: true,
  },
];

export const LOCAL_TOOLS: ToolEntry[] = [
  {
    slug: "video-cutter",
    label: "Video Cutter",
    description:
      "Trim a clip to an in/out point with a lossless stream copy when the cut lands on a keyframe.",
    icon: Scissors,
    requiresKey: false,
  },
  {
    slug: "video-cropper",
    label: "Cropper",
    description:
      "Reframe a source video to vertical, square, or a custom aspect ratio.",
    icon: Crop,
    requiresKey: false,
  },
  {
    slug: "video-compressor",
    label: "Compressor",
    description:
      "Reduce file size for faster uploads and sharing without a separate re-encode step.",
    icon: FileZip,
    requiresKey: false,
  },
  {
    slug: "audio-balancer",
    label: "Audio Balancer",
    description:
      "Normalize loudness across a track or between dialogue and music beds.",
    icon: Waveform,
    requiresKey: false,
  },
  {
    slug: "audio-converter",
    label: "Audio Converter",
    description: "Convert between common audio formats and sample rates.",
    icon: ArrowsCounterClockwise,
    requiresKey: false,
  },
  {
    slug: "video-to-audio-converter",
    label: "Video-to-Audio Converter",
    description: "Extract the audio track from a video file as a standalone file.",
    icon: FileAudio,
    requiresKey: false,
  },
  {
    slug: "media-inspector",
    label: "Media Inspector",
    description:
      "Read codec, resolution, duration, and stream metadata for any uploaded file.",
    icon: MagnifyingGlass,
    requiresKey: false,
  },
  {
    slug: "speech-enhancer",
    label: "Speech Enhancer",
    description:
      "Reduce background noise and room tone with real FFT-based denoising.",
    icon: SpeakerHigh,
    requiresKey: false,
  },
  {
    label: "Social Media Importer",
    description:
      "Pull in media you already have rights to from a connected source for editing.",
    icon: CloudArrowDown,
    requiresKey: false,
  },
];
