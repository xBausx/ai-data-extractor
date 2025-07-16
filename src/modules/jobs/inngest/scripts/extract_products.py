# src/modules/jobs/inngest/scripts/extract_products.py

import os
import base64
import requests
from openai import OpenAI
import json
import sys

try:
    # --- Configuration ---
    API_KEY = os.environ.get("OPENAI_API_KEY")
    if not API_KEY:
        raise ValueError("The OPENAI_API_KEY environment variable is missing.")

    IMAGE_URL = """__IMAGE_URL__"""
    USER_PROMPT = """__USER_PROMPT__"""
    SYSTEM_PROMPT = """__SYSTEM_PROMPT__"""

    client = OpenAI(api_key=API_KEY)

    PRODUCT_SCHEMA = {
        "type": "object",
        "properties": {
            "products": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "group": {"type": "string", "description": "The category for this product."},
                        "name": {"type": "string", "description": "The name of the product."},
                        "description": {"type": "string", "description": "The product description."},
                        "price": {"type": "string", "description": "The price of the product."},
                        "limit": {"type": "string", "description": "Any limit or deal info."}
                    },
                    "required": ["group", "name"]
                }
            }
        },
        "required": ["products"]
    }

    # --- Execution ---
    # This is the key fix: All informational logs are now printed to stderr.
    # This keeps the stdout channel clean for the final data output.
    print("Starting data extraction process in sandbox...", file=sys.stderr)

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }

    response = requests.get(IMAGE_URL, headers=headers)
    response.raise_for_status()
    base64_image = base64.b64encode(response.content).decode('utf-8')
    print("Image downloaded and encoded successfully.", file=sys.stderr)

    api_response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": USER_PROMPT},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}
                    }
                ]
            }
        ],
        tools=[{
            "type": "function",
            "function": {
                "name": "saveDetectedProducts",
                "description": "Saves the structured data of all products found in the image.",
                "parameters": PRODUCT_SCHEMA
            }
        }],
        tool_choice={"type": "function", "function": {"name": "saveDetectedProducts"}}
    )
    print("OpenAI API call completed.", file=sys.stderr)

    tool_call = api_response.choices[0].message.tool_calls[0]
    arguments = json.loads(tool_call.function.arguments)

    # The final, machine-readable data is the ONLY thing printed to stdout.
    print(json.dumps(arguments))

except Exception as e:
    print(f"An error occurred in the Python script: {e}", file=sys.stderr)
    raise e