async function getBackgroundImage(req, res) {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        error: "Search query required",
      });
    }

    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(
        query
      )}&per_page=15&orientation=landscape`,
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY,
        },
      }
    );

    const data = await response.json();

    if (!data.photos?.length) {
      return res.status(404).json({
        error: "No images found",
      });
    }

    // Highest resolution image
    function score(photo) {
      const alt =
        (photo.alt || "").toLowerCase();

      let score = 0;

      const keywords = [
        "landscape",
        "city",
        "mountain",
        "beach",
        "skyline",
        "nature",
        "sunset",
        "travel"
      ];

      keywords.forEach(word => {
        if (alt.includes(word)) {
          score += 10;
        }
      });

      score +=
        (photo.width * photo.height) /
        1000000;

      return score;
    }

    const bestImage = data.photos.sort(
      (a, b) =>
        score(b) - score(a)
    )[0];

    res.json({
      imageUrl:
        bestImage.src.large2x ||
        bestImage.src.original ||
        bestImage.src.large,
      photographer: bestImage.photographer,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to fetch image",
    });
  }
}

module.exports = {
  getBackgroundImage,
};