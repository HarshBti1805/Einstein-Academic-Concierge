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

export const akrobat = localFont({
  src: "../public/fonts/Akrobat-Regular.otf",
  variable: "--font-akrobat",
  display: "swap",
});

export const avenirNext = localFont({
  src: "../public/fonts/AvenirNextLTPro-Regular.otf",
  variable: "--font-avenir-next",
  display: "swap",
});

export const bogitaMono = localFont({
  src: "../public/fonts/BogitaMono-Regular.otf",
  variable: "--font-bogita-mono",
  display: "swap",
});

export const josefinSans = localFont({
  src: "../public/fonts/JosefinSans-Regular.ttf",
  variable: "--font-josefin-sans",
  display: "swap",
});

export const neueMachina = localFont({
  src: "../public/fonts/NeueMachina-Regular.otf",
  variable: "--font-neue-machina",
  display: "swap",
});

export const spaceGrotesk = localFont({
  src: "../public/fonts/SpaceGrotesk-Regular.ttf",
  variable: "--font-space-grotesk",
  display: "swap",
});

export const spaceMono = localFont({
  src: "../public/fonts/SpaceMono-Regular.ttf",
  variable: "--font-space-mono",
  display: "swap",
});

export const violetSans = localFont({
  src: "../public/fonts/VioletSans-Regular.ttf",
  variable: "--font-violet-sans",
  display: "swap",
});

export const vonique = localFont({
  src: "../public/fonts/Vonique64-JKgM.ttf",
  variable: "--font-vonique",
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
  akrobat.variable,
  avenirNext.variable,
  bogitaMono.variable,
  josefinSans.variable,
  neueMachina.variable,
  spaceGrotesk.variable,
  spaceMono.variable,
  violetSans.variable,
  vonique.variable,
].join(" ");
