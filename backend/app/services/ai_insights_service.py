"""AI Insights service — GPT-4 powered reaction analysis, causes, and recommendations."""

import json
import logging
import uuid
from datetime import datetime, timezone

import httpx
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.product import Product
from app.models.reaction import Reaction, ReactionProduct
from app.models.trigger_result import TriggerResult

logger = logging.getLogger(__name__)
settings = get_settings()


async def get_ai_insights(user_id: uuid.UUID, db: AsyncSession) -> dict:
    """Use GPT-4 to analyze the user's reaction history and provide:
    - Possible trigger ingredients with explanations
    - Personalized recommendations
    - Dermatological advice
    - Safer product suggestions
    """
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI insights require OPENAI_API_KEY to be configured.",
        )

    # Gather user's reaction data
    reactions_result = await db.execute(
        select(Reaction).where(Reaction.user_id == user_id).order_by(Reaction.reaction_date.desc())
    )
    reactions = reactions_result.scalars().all()

    if len(reactions) < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No reactions logged yet. Log at least one reaction to get AI insights.",
        )

    # Build reaction context
    reaction_data = []
    for reaction in reactions:
        product_ids_result = await db.execute(
            select(ReactionProduct.c.product_id).where(
                ReactionProduct.c.reaction_id == reaction.id
            )
        )
        product_ids = [row[0] for row in product_ids_result.all()]

        products_info = []
        if product_ids:
            products_result = await db.execute(
                select(Product).where(Product.id.in_(product_ids))
            )
            products = products_result.scalars().all()
            for p in products:
                products_info.append({
                    "name": p.name,
                    "brand": p.brand,
                    "ingredients": p.ingredients or [],
                })

        reaction_data.append({
            "date": str(reaction.reaction_date),
            "severity": reaction.severity,
            "symptoms": reaction.symptoms or [],
            "notes": reaction.notes or "",
            "products": products_info,
        })

    # Get existing trigger results for context
    triggers_result = await db.execute(
        select(TriggerResult)
        .where(TriggerResult.user_id == user_id)
        .order_by(TriggerResult.confidence_score.desc())
        .limit(10)
    )
    existing_triggers = [
        {"ingredient": t.ingredient, "confidence": round(t.confidence_score * 100)}
        for t in triggers_result.scalars().all()
    ]

    prompt = f"""You are a professional dermatologist and cosmetic ingredient expert. 
Analyze the following skin reaction history and provide detailed, personalized insights.

REACTION HISTORY:
{json.dumps(reaction_data, indent=2)}

STATISTICAL TRIGGER ANALYSIS (from pattern detection):
{json.dumps(existing_triggers, indent=2) if existing_triggers else "Not yet run"}

Please provide a comprehensive analysis in the following JSON format:
{{
  "summary": "2-3 sentence overview of the user's skin reaction pattern",
  "possible_causes": [
    {{
      "ingredient": "ingredient name",
      "reason": "why this ingredient may be causing reactions",
      "severity_risk": "high|medium|low",
      "found_in_products": ["product names where this ingredient appears"]
    }}
  ],
  "recommendations": [
    {{
      "title": "recommendation title",
      "description": "detailed actionable advice",
      "priority": "high|medium|low"
    }}
  ],
  "ingredients_to_avoid": ["list of specific ingredients to avoid"],
  "safe_ingredient_alternatives": [
    {{
      "avoid": "ingredient to avoid",
      "use_instead": "safer alternative",
      "reason": "why the alternative is better"
    }}
  ],
  "lifestyle_advice": [
    "specific lifestyle tip 1",
    "specific lifestyle tip 2"
  ],
  "when_to_see_doctor": "advice on when professional medical consultation is needed",
  "skin_type_assessment": "assessment of likely skin type and sensitivity based on reactions",
  "confidence_level": "high|medium|low",
  "disclaimer": "standard medical disclaimer"
}}

Be specific, evidence-based, and compassionate. Focus on practical, actionable advice.
Only return the JSON object, no other text."""

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o",
                    "max_tokens": 2000,
                    "temperature": 0.3,  # Lower temperature for more consistent medical advice
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a dermatologist and cosmetic ingredient expert. Always provide evidence-based, compassionate advice. Always include appropriate medical disclaimers.",
                        },
                        {
                            "role": "user",
                            "content": prompt,
                        },
                    ],
                },
            )

        if response.status_code != 200:
            logger.error("OpenAI API error: %s", response.text)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="AI analysis failed. Please try again later.",
            )

        data = response.json()
        content = data["choices"][0]["message"]["content"].strip()

        # Strip markdown if present
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]

        result = json.loads(content)
        result["analyzed_at"] = datetime.now(timezone.utc).isoformat()
        result["reactions_analyzed"] = len(reactions)

        return result

    except json.JSONDecodeError:
        logger.error("Failed to parse OpenAI response as JSON")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI analysis returned an unexpected format. Please try again.",
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="AI analysis timed out. Please try again.",
        )
