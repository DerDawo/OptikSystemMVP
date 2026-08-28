import { supabase } from './utils';

export type MessageChannel = 'sms' | 'email' | 'whatsapp';

export type SendMessagePayload = {
    to: string;
    message: string;
    subject?: string;
};

export type MessageDeliveryResult = {
    channel: MessageChannel;
    success: boolean;
    error?: string;
};

const edgeFunctionByChannel: Record<MessageChannel, string> = {
    sms: 'send-sms',
    email: 'send-email',
    whatsapp: 'send-whatsapp',
};

export const implementedMessageChannels: MessageChannel[] = ['sms', 'email'];

export const sendMessage = async (
    channel: MessageChannel,
    payload: SendMessagePayload,
): Promise<MessageDeliveryResult> => {
    const { error } = await supabase.functions.invoke(edgeFunctionByChannel[channel], {
        body: payload,
    });

    if (error) {
        return { channel, success: false, error: error.message };
    }

    return { channel, success: true };
};

export const normalizePhoneNumberForSms = (phoneNumber: string): string => {
    const trimmed = phoneNumber.trim().replace(/[\s()-]/g, '');

    if (trimmed.startsWith('+')) {
        return trimmed;
    }

    if (trimmed.startsWith('0')) {
        return `+49${trimmed.slice(1)}`;
    }

    return trimmed;
};
