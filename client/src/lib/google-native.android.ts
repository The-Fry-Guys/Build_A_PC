import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { createNativeGoogleAuth } from './google-native-flow';

// Android's SDK requests tokens for our backend's Web client audience.
export const nativeGoogle = createNativeGoogleAuth(
  GoogleSignin,
  () => process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  statusCodes,
);
