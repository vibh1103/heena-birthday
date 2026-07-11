export const TEXTURE_KEYS = {
  PLAYER: 'player-heena',
  CRYSTAL: 'birthday-crystal',
  FIREFLY: 'moon-firefly',
  PORTAL: 'wish-portal',
  STAR: 'star-particle',
  SPARK: 'spark-particle',
  TILE: 'moonlit-tile',
  PORTRAIT_HEENA_HAPPY: 'portrait-heena-happy',
  PORTRAIT_HEENA_CURIOUS: 'portrait-heena-curious',
  PORTRAIT_FIREFLY_NEUTRAL: 'portrait-firefly-neutral',
  PORTRAIT_FIREFLY_EXCITED: 'portrait-firefly-excited',
  COFFEE: 'coffee-mug',
  LAPTOP: 'laptop-computer',
  TEDDY: 'baby-teddy',
  KEY: 'birthday-key',
  DOOR: 'cozy-door',
  MILK: 'milk-carton',
  CHOCOLATE: 'chocolate-bar',
  EGGS: 'egg-basket',
  FLOUR: 'flour-bag',
  SUGAR: 'sugar-bowl',
} as const;

export const AUDIO_KEYS = {
  COLLECT: 'collect-chime',
  TRANSITION: 'transition-whoosh',
  TALK: 'dialogue-bell',
  WIN: 'wish-bloom',
} as const;

export type TextureKey = (typeof TEXTURE_KEYS)[keyof typeof TEXTURE_KEYS];
export type AudioKey = (typeof AUDIO_KEYS)[keyof typeof AUDIO_KEYS];
