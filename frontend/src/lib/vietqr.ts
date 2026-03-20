export interface VietQrConfig {
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export interface VietQrBank {
  code: string;
  name: string;
}

export const VIETQR_BANKS: VietQrBank[] = [
  { code: 'VCB', name: 'Vietcombank' },
  { code: 'TCB', name: 'Techcombank' },
  { code: 'BIDV', name: 'BIDV' },
  { code: 'CTG', name: 'VietinBank' },
  { code: 'ACB', name: 'ACB' },
  { code: 'VPB', name: 'VPBank' },
  { code: 'MBB', name: 'MB Bank' },
  { code: 'TPB', name: 'TPBank' },
  { code: 'VIB', name: 'VIB' },
  { code: 'STB', name: 'Sacombank' },
  { code: 'HDB', name: 'HDBank' },
  { code: 'OCB', name: 'OCB' },
  { code: 'SHB', name: 'SHB' },
  { code: 'MSB', name: 'MSB' },
  { code: 'VBA', name: 'Agribank' },
];

export const DEFAULT_VIETQR_BANK: VietQrBank = {
  code: 'VCB',
  name: 'Vietcombank',
};

export const DEFAULT_VIETQR_CONFIG: VietQrConfig = {
  bankCode: DEFAULT_VIETQR_BANK.code,
  bankName: DEFAULT_VIETQR_BANK.name,
  accountNumber: '0123456789',
  accountName: 'LINGERIE SHOP',
};

const normalizeBankName = (value?: string): string => {
  if (!value) return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
};

export const getVietQrBankByCode = (code?: string): VietQrBank | undefined => {
  if (!code) return undefined;
  return VIETQR_BANKS.find((bank) => bank.code === code.toUpperCase());
};

export const resolveVietQrBank = (code?: string, name?: string): VietQrBank => {
  const byCode = getVietQrBankByCode(code);
  if (byCode) return byCode;

  const normalizedName = normalizeBankName(name);
  if (normalizedName) {
    const byName = VIETQR_BANKS.find((bank) => normalizeBankName(bank.name) === normalizedName);
    if (byName) return byName;
  }

  return DEFAULT_VIETQR_BANK;
};

export function buildVietQrUrl(params: {
  bankCode: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  addInfo: string;
  template?: string;
}) {
  const { bankCode, accountNumber, accountName, amount, addInfo, template = 'compact2' } = params;
  const query = new URLSearchParams();
  query.set('amount', String(Math.round(amount)));
  query.set('addInfo', addInfo);
  query.set('accountName', accountName);
  return `https://img.vietqr.io/image/${bankCode}-${accountNumber}-${template}.png?${query.toString()}`;
}
