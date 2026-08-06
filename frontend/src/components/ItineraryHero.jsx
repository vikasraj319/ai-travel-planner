import { useEffect, useState } from "react";
import { apiUrl } from "../lib/api";
import { FALLBACK_IMAGES, isValidImageUrl } from "../utils/imageUtils";

export default function ItineraryHero({
  destination,
  imagePrompt,
}) {
  const [background, setBackground] =
    useState(FALLBACK_IMAGES.destination);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    async function fetchImage() {
      try {
        const query = imagePrompt || destination || "travel landscape";
        const response = await fetch(
          apiUrl(`/api/images?query=${encodeURIComponent(query)}`)
        );

        const data = await response.json();

        if (data.imageUrl && isValidImageUrl(data.imageUrl)) {
          setBackground(data.imageUrl);
        } else {
          setBackground(FALLBACK_IMAGES.destination);
        }
      } catch (error) {
        console.error(error);
        setBackground(FALLBACK_IMAGES.destination);
      } finally {
        setLoading(false);
      }
    }

    fetchImage();
  }, [destination, imagePrompt]);

  return (
    <div
      className="relative h-[500px] bg-cover bg-center"
      style={{
        backgroundImage: `url(${background})`,
      }}
    >
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 flex h-full items-center justify-center">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-white">
            {destination}
          </h1>

          {loading && (
            <p className="text-white mt-4">
              Loading scenery...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}