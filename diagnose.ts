import { db } from './server-db';

async function test() {
  try {
    const intSettings = await db.getIntegrationSettings();
    const settings = await db.getSettings();
    console.log('INTEGRATION_SETTINGS:', {
      bradesco_cnpj: intSettings.bradesco_cnpj,
      bradesco_env: intSettings.bradesco_env,
      bradesco_agency: intSettings.bradesco_agency,
      bradesco_wallet: intSettings.bradesco_wallet,
    });
    console.log('COMPANY_SETTINGS:', {
      cnpj: settings.cnpj,
      company_name: settings.company_name
    });
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

test();
