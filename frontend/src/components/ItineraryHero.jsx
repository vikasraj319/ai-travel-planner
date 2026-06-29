import { useEffect, useState } from "react";

export default function ItineraryHero({
  destination,
  imagePrompt,
}) {
  const [background, setBackground] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    async function fetchImage() {
      try {
        const response = await fetch(
          `http://localhost:5000/api/images?query=${encodeURIComponent(
            imagePrompt
          )}`
        );

        const data =
          await response.json();

        setBackground(data.imageUrl);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    if (imagePrompt) {
      fetchImage();
    }
  }, [imagePrompt]);

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