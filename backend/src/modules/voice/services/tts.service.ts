/**
 * Text-to-Speech (TTS) Service
 *
 * Per FINAL_REQUIREMENTS.md - Voice Streaming:
 * - Google Cloud Text-to-Speech integration
 * - Natural voice synthesis for responses
 * - Streaming audio output
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TextToSpeechClient, protos } from '@google-cloud/text-to-speech';
import { AudioEncoding, VoiceDefaults } from '../dtos';

type ISynthesizeSpeechRequest = protos.google.cloud.texttospeech.v1.ISynthesizeSpeechRequest;

/**
 * TTS configuration
 */
export interface TtsConfig {
  languageCode: string;
  voiceName?: string;
  ssmlGender?: 'MALE' | 'FEMALE' | 'NEUTRAL';
  speakingRate?: number; // 0.25 to 4.0, default 1.0
  pitch?: number; // -20.0 to 20.0, default 0.0
  audioEncoding: AudioEncoding;
  sampleRateHertz: number;
}

/**
 * TTS result
 */
export interface TtsResult {
  audioData: string; // Base64 encoded audio
  encoding: AudioEncoding;
  sampleRateHertz: number;
  text: string;
}

const DEFAULT_TTS_CONFIG: TtsConfig = {
  languageCode: VoiceDefaults.LANGUAGE_CODE,
  voiceName: 'en-US-Neural2-J', // Natural-sounding neural voice
  ssmlGender: 'NEUTRAL',
  speakingRate: 1.0,
  pitch: 0.0,
  audioEncoding: VoiceDefaults.AUDIO_ENCODING,
  sampleRateHertz: VoiceDefaults.SAMPLE_RATE_HERTZ,
};

/**
 * Voice presets for different response types
 */
export const VoicePresets = {
  // Default conversational voice
  DEFAULT: {
    voiceName: 'en-US-Neural2-J',
    speakingRate: 1.0,
    pitch: 0.0,
  },
  // Friendly assistant voice
  ASSISTANT: {
    voiceName: 'en-US-Neural2-C',
    speakingRate: 1.05,
    pitch: 1.0,
  },
  // Navigation/directions voice
  NAVIGATION: {
    voiceName: 'en-US-Neural2-D',
    speakingRate: 0.95,
    pitch: -1.0,
  },
  // Error/warning voice
  ALERT: {
    voiceName: 'en-US-Neural2-A',
    speakingRate: 0.9,
    pitch: -2.0,
  },
} as const;

@Injectable()
export class TtsService implements OnModuleInit {
  private readonly logger = new Logger(TtsService.name);
  private client: TextToSpeechClient | null = null;

  async onModuleInit() {
    try {
      // Initialize Google Cloud TTS client
      // Credentials loaded from GOOGLE_APPLICATION_CREDENTIALS env var
      this.client = new TextToSpeechClient();
      this.logger.log('Google Cloud Text-to-Speech client initialized');
    } catch (error) {
      this.logger.error('Failed to initialize TTS client', error);
      // Service will work in fallback mode
    }
  }

  /**
   * Synthesize text to speech
   */
  async synthesize(text: string, config?: Partial<TtsConfig>): Promise<TtsResult> {
    if (!this.client) {
      this.logger.warn('TTS client not initialized, returning empty audio');
      return this.getEmptyResult(text);
    }

    const ttsConfig: TtsConfig = {
      ...DEFAULT_TTS_CONFIG,
      ...config,
    };

    const request: ISynthesizeSpeechRequest = {
      input: { text },
      voice: {
        languageCode: ttsConfig.languageCode,
        name: ttsConfig.voiceName,
        ssmlGender: this.mapSsmlGender(ttsConfig.ssmlGender),
      },
      audioConfig: {
        audioEncoding: this.mapAudioEncoding(ttsConfig.audioEncoding),
        sampleRateHertz: ttsConfig.sampleRateHertz,
        speakingRate: ttsConfig.speakingRate,
        pitch: ttsConfig.pitch,
      },
    };

    try {
      const [response] = await this.client.synthesizeSpeech(request);

      if (!response.audioContent) {
        return this.getEmptyResult(text);
      }

      // Convert audio content to base64
      const audioData =
        typeof response.audioContent === 'string'
          ? response.audioContent
          : Buffer.from(response.audioContent).toString('base64');

      return {
        audioData,
        encoding: ttsConfig.audioEncoding,
        sampleRateHertz: ttsConfig.sampleRateHertz,
        text,
      };
    } catch (error) {
      this.logger.error('TTS synthesis failed', error);
      throw error;
    }
  }

  /**
   * Synthesize SSML (Speech Synthesis Markup Language)
   * Allows more control over pronunciation, pauses, emphasis
   */
  async synthesizeSsml(ssml: string, config?: Partial<TtsConfig>): Promise<TtsResult> {
    if (!this.client) {
      this.logger.warn('TTS client not initialized');
      return this.getEmptyResult(ssml);
    }

    const ttsConfig: TtsConfig = {
      ...DEFAULT_TTS_CONFIG,
      ...config,
    };

    const request: ISynthesizeSpeechRequest = {
      input: { ssml },
      voice: {
        languageCode: ttsConfig.languageCode,
        name: ttsConfig.voiceName,
        ssmlGender: this.mapSsmlGender(ttsConfig.ssmlGender),
      },
      audioConfig: {
        audioEncoding: this.mapAudioEncoding(ttsConfig.audioEncoding),
        sampleRateHertz: ttsConfig.sampleRateHertz,
        speakingRate: ttsConfig.speakingRate,
        pitch: ttsConfig.pitch,
      },
    };

    try {
      const [response] = await this.client.synthesizeSpeech(request);

      if (!response.audioContent) {
        return this.getEmptyResult(ssml);
      }

      const audioData =
        typeof response.audioContent === 'string'
          ? response.audioContent
          : Buffer.from(response.audioContent).toString('base64');

      return {
        audioData,
        encoding: ttsConfig.audioEncoding,
        sampleRateHertz: ttsConfig.sampleRateHertz,
        text: ssml,
      };
    } catch (error) {
      this.logger.error('SSML synthesis failed', error);
      throw error;
    }
  }

  /**
   * Generate response audio with appropriate voice preset
   */
  async generateResponse(
    text: string,
    type: keyof typeof VoicePresets = 'DEFAULT',
  ): Promise<TtsResult> {
    const preset = VoicePresets[type];
    return this.synthesize(text, preset);
  }

  /**
   * Generate navigation instruction audio
   */
  async generateNavigationAudio(instruction: string): Promise<TtsResult> {
    // Use SSML for better navigation instruction delivery
    const ssml = `
      <speak>
        <prosody rate="95%" pitch="-1st">
          ${this.escapeXml(instruction)}
        </prosody>
      </speak>
    `.trim();

    return this.synthesizeSsml(ssml, VoicePresets.NAVIGATION);
  }

  /**
   * Generate confirmation audio
   */
  async generateConfirmation(text: string): Promise<TtsResult> {
    const ssml = `
      <speak>
        <prosody rate="105%">
          ${this.escapeXml(text)}
        </prosody>
      </speak>
    `.trim();

    return this.synthesizeSsml(ssml, VoicePresets.ASSISTANT);
  }

  /**
   * Generate error/warning audio
   */
  async generateAlert(text: string): Promise<TtsResult> {
    const ssml = `
      <speak>
        <prosody rate="90%" pitch="-2st">
          <emphasis level="moderate">
            ${this.escapeXml(text)}
          </emphasis>
        </prosody>
      </speak>
    `.trim();

    return this.synthesizeSsml(ssml, VoicePresets.ALERT);
  }

  /**
   * Map our encoding to Google's
   */
  private mapAudioEncoding(
    encoding: AudioEncoding,
  ): 'LINEAR16' | 'OGG_OPUS' | 'MP3' {
    switch (encoding) {
      case AudioEncoding.LINEAR16:
        return 'LINEAR16';
      case AudioEncoding.WEBM_OPUS:
      case AudioEncoding.OGG_OPUS:
        return 'OGG_OPUS';
      default:
        return 'LINEAR16';
    }
  }

  /**
   * Map SSML gender
   */
  private mapSsmlGender(
    gender?: 'MALE' | 'FEMALE' | 'NEUTRAL',
  ): 'MALE' | 'FEMALE' | 'NEUTRAL' {
    switch (gender) {
      case 'MALE':
        return 'MALE';
      case 'FEMALE':
        return 'FEMALE';
      case 'NEUTRAL':
      default:
        return 'NEUTRAL';
    }
  }

  /**
   * Escape XML special characters for SSML
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Get empty result
   */
  private getEmptyResult(text: string): TtsResult {
    return {
      audioData: '',
      encoding: DEFAULT_TTS_CONFIG.audioEncoding,
      sampleRateHertz: DEFAULT_TTS_CONFIG.sampleRateHertz,
      text,
    };
  }
}
