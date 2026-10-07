import colors from "@/constants/colors";

/**
 * Jobagogo uses its dark palette consistently, regardless of the device's
 * appearance preference. app.json also sets the native interface style to dark
 * so system bars match the app.
 */
export function useColors() {
  return { ...colors.dark, radius: colors.radius };
}
