import { ConfigService } from '@nestjs/config';

export interface PayDunyaConfig {
  masterKey: string;
  privateKey: string;
  token: string;
  mode: 'test' | 'live';
  baseUrl: string;
}

export const getPayDunyaConfig = (
  configService: ConfigService,
): PayDunyaConfig => {
  const mode = configService.get<string>('PAYDUNYA_MODE') || 'test';

  return {
    masterKey: configService.get<string>('PAYDUNYA_MASTER_KEY'),
    privateKey: configService.get<string>('PAYDUNYA_PRIVATE_KEY'),
    token: configService.get<string>('PAYDUNYA_TOKEN'),
    mode: mode as 'test' | 'live',
    baseUrl:
      mode === 'live'
        ? 'https://app.paydunya.com/api/v1'
        : 'https://app.paydunya.com/sandbox-api/v1',
  };
};
