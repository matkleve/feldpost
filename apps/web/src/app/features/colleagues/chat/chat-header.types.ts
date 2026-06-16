export type ChatHeaderVariant = 'channel' | 'dm' | 'empty';

export type ChatDetailsKind = 'channel' | 'member';

export type ChatChannelDetailTab = 'about' | 'members';

export interface ChatDetailsRequest {
  kind: ChatDetailsKind;
  channelTab?: ChatChannelDetailTab;
}

export type ChatRightRailInspector = 'closed' | 'channel' | 'member';
