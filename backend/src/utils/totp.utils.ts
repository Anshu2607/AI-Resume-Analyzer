import {
  generateSecret,
  generateURI,
  verify,
} from "otplib";

import QRCode from "qrcode";

import {
  ADMIN_AUTH_CONFIG,
} from "../config/adminAuth.config.js";

// =====================================
// TOTP CONFIGURATION
// =====================================

const TOTP_ALGORITHM = "sha1" as const;

const TOTP_DIGITS =
  ADMIN_AUTH_CONFIG.totp.digits;

const TOTP_PERIOD =
  ADMIN_AUTH_CONFIG.totp.period;

const TOTP_ISSUER =
  ADMIN_AUTH_CONFIG.totp.issuer;

const CLOCK_TOLERANCE_SECONDS = 30;

// =====================================
// TOTP VERIFICATION RESULT
// =====================================

export interface TotpVerificationResult {

  valid: boolean;

  timeStep: number | null;

}

// =====================================
// GENERATE MFA SECRET
// =====================================

export const generateTotpSecret = (): string => {

  return generateSecret();

};

// =====================================
// GENERATE AUTHENTICATOR URI
// =====================================

export const generateTotpUri = (

  email: string,

  secret: string

): string => {

  return generateURI({

    issuer: TOTP_ISSUER,

    label: email,

    secret,

    algorithm: TOTP_ALGORITHM,

    digits: TOTP_DIGITS,

    period: TOTP_PERIOD,

  });

};

// =====================================
// GENERATE MFA QR CODE
// =====================================

export const generateTotpQRCode = async (

  email: string,

  secret: string

): Promise<string> => {

  const uri = generateTotpUri(

    email,

    secret

  );

  return QRCode.toDataURL(uri, {

    width: 320,

    margin: 2,

    errorCorrectionLevel: "M",

    color: {

      dark: "#000000",

      light: "#FFFFFF",

    },

  });

};

// =====================================
// VALIDATE OTP FORMAT
// =====================================

export const isValidTotpFormat = (

  token: string

): boolean => {

  return /^[0-9]{6}$/.test(token);

};

// =====================================
// VERIFY AUTHENTICATOR OTP
// =====================================

export const verifyTotp = async (

  secret: string,

  token: string

): Promise<TotpVerificationResult> => {

  if (!isValidTotpFormat(token)) {

    return {

      valid: false,

      timeStep: null,

    };

  }

  // Capture the verification time once.

  const epoch = Math.floor(
    Date.now() / 1000
  );

  const result = await verify({

    secret,

    token,

    algorithm: TOTP_ALGORITHM,

    digits: TOTP_DIGITS,

    period: TOTP_PERIOD,

    epoch,

    epochTolerance:
      CLOCK_TOLERANCE_SECONDS,

  });

  if (!result.valid) {

    return {

      valid: false,

      timeStep: null,

    };

  }

  // Calculate the exact accepted time step.
  // This will support OTP replay prevention.

  const currentTimeStep = Math.floor(
    epoch / TOTP_PERIOD
  );

  const acceptedTimeStep =
    currentTimeStep + result.delta;

  return {

    valid: true,

    timeStep: acceptedTimeStep,

  };

};