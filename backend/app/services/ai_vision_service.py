"""AI Vision service — extract product info from images using OpenAI GPT-4o Vision."""

import base64
import json
import logging
from typing import Optional

import httpx
from fastapi import HTTPException, status

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


async def scan_product_from_image(image_url: str) -> dict:
    """Use OpenAI GPT-4o Vision to extract product name, brand, and ingredients from an image.

    Args:
        image_url: Public URL of the product image (Supabase Storage URL)

    Returns:
        dict with keys: name, brand, ingredients (list of strings), confidence
    """
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI scanning is not configured. Please add OPENAI_API_KEY.",
        )

    prompt = """You are a cosmetic product label reader. Analyze this image of a cosmetic or skincare product.

Extract the following information:
1. Product name (the main product name on the label)
2. Brand name (the manufacturer/brand)
3. Ingredients list (all ingredients listed, in order if visible)

Return ONLY a valid JSON object with this exact structure:
{
  "name": "product name here",
  "brand": "brand name here",
  "ingredients": ["ingredient1", "ingredient2", "ingredient3"],
  "confidence": "high|medium|low"
}

If you cannot read certain information clearly, use null for that field.
If no ingredients are visible, return an empty array for ingredients.
Do not include any text outside the JSON object."""

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o",
                    "max_tokens": 1000,
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": prompt,
                                },
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": image_url,
                                        "detail": "high",
                                    },
                                },
                            ],
                        }
                    ],
                },
            )

        if response.status_code != 200:
            logger.error("OpenAI Vision API error: %s", response.text)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="AI scanning failed. Please fill in the product details manually.",
            )

        data = response.json()
        content = data["choices"][0]["message"]["content"].strip()

        # Parse JSON response
        # Strip markdown code blocks if present
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]

        result = json.loads(content)

        return {
            "name": result.get("name") or "",
            "brand": result.get("brand") or "",
            "ingredients": result.get("ingredients") or [],
            "confidence": result.get("confidence", "medium"),
        }

    except json.JSONDecodeError:
        logger.error("Failed to parse OpenAI Vision response as JSON")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI could not read the product label clearly. Please fill in manually.",
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="AI scanning timed out. Please try again or fill in manually.",
        )
