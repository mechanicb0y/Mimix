/**
 * The legal entity behind Mimix, used in the Terms and Privacy Policy. Set these in the environment
 * once the company details are final; until then the pages show the bracketed placeholders so the
 * gaps are obvious to the lawyer reviewing them.
 */
export const COMPANY = {
  legalName: process.env.NEXT_PUBLIC_COMPANY_LEGAL_NAME || '[Company legal name]',
  registrationNumber: process.env.NEXT_PUBLIC_COMPANY_REG_NO || '[Company registration number]',
  address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS || '[Registered address]',
  governingLaw: process.env.NEXT_PUBLIC_GOVERNING_LAW || '[Governing law, likely Malaysia]',
  courts: process.env.NEXT_PUBLIC_COURTS || '[Courts with jurisdiction]',
} as const

/** True while any company detail is still a placeholder. */
export const COMPANY_DETAILS_PENDING = Object.values(COMPANY).some((v) => v.startsWith('['))
