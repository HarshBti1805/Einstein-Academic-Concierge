import localFont from "next/font/local";

// Define all local fonts
export const syne = localFont({
  src: "../public/fonts/Syne.ttf",
  variable: "--font-syne",
  display: "swap",
});

export const manrope = localFont({
  src: "../public/fonts/Manrope-Regular.ttf",
  variable: "--font-manrope",
  display: "swap",
});

export const poppins = localFont({
  src: "../public/fonts/Poppins.ttf",
  variable: "--font-poppins",
  display: "swap",
});

export const raleway = localFont({
  src: "../public/fonts/Raleway.ttf",
  variable: "--font-raleway",
  display: "swap",
});

export const playfairDisplay = localFont({
  src: "../public/fonts/PlayfairDisplay.ttf",
  variable: "--font-playfair",
  display: "swap",
});

export const arvo = localFont({
  src: "../public/fonts/Arvo-Regular.ttf",
  variable: "--font-arvo",
  display: "swap",
});

export const montserrat = localFont({
  src: "../public/fonts/Montserrat.ttf",
  variable: "--font-montserrat",
  display: "swap",
});

export const ttCommons = localFont({
  src: "../public/fonts/TTCommons.otf",
  variable: "--font-tt-commons",
  display: "swap",
});

// Export all font variables as a single string for easy className usage
export const fontVariables = [
  syne.variable,
  manrope.variable,
  poppins.variable,
  raleway.variable,
  playfairDisplay.variable,
  arvo.variable,
  montserrat.variable,
  ttCommons.variable,
].join(" ");
