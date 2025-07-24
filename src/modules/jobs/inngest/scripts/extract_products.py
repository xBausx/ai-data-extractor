# src/modules/jobs/inngest/scripts/extract_products.py

import os
import base64
import requests
from openai import OpenAI
import json
import sys

try:
    # --- Configuration ---
    # The API Key is the ONLY variable we now expect from the environment.
    API_KEY = os.environ.get("OPENAI_API_KEY")
    if not API_KEY:
        raise ValueError("The OPENAI_API_KEY environment variable is missing.")
    client = OpenAI(api_key=API_KEY)

    # Read all dynamic data from the input.json file.
    INPUT_FILE_PATH = '/home/user/input.json'
    with open(INPUT_FILE_PATH, 'r') as f:
        payload = json.load(f)

    OPERATION_MODE = payload.get("operation_mode")
    if not OPERATION_MODE:
        raise ValueError("The 'operation_mode' is missing from input.json.")

    # --- Tool Schemas (Unchanged) ---
    PRODUCT_DATA_SCHEMA = {
        "type": "object",
        "properties": {
            "products": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "group": {"type": "string"},
                        "name": {"type": "string"},
                        "description": {"type": "string"},
                        "price": {"type": "string"},
                        "limit": {"type": "string"}
                    },
                    "required": ["group", "name"]
                }
            }
        },
        "required": ["products"]
    }

    output_data = {}

    # --- Main Logic based on Operation Mode ---

    if OPERATION_MODE == "extract":
        print("Operation Mode: EXTRACT. Starting data extraction from image...", file=sys.stderr)
        
        USER_PROMPT = payload.get("user_prompt")
        SYSTEM_PROMPT = payload.get("system_prompt")
        IMAGE_URL = payload.get("image_url")
        if not all([USER_PROMPT, SYSTEM_PROMPT, IMAGE_URL]):
            raise ValueError("One or more required fields for 'extract' mode are missing from input.json.")

        headers = {'User-Agent': 'Mozilla/5.0'}
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
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                    ]
                }
            ],
            tools=[{
                "type": "function",
                "function": {
                    "name": "saveDetectedProducts",
                    "description": "Saves the structured data of all products found in the image.",
                    "parameters": PRODUCT_DATA_SCHEMA
                }
            }],
            tool_choice={"type": "function", "function": {"name": "saveDetectedProducts"}}
        )
        print("OpenAI API call for extraction completed.", file=sys.stderr)
        tool_call = api_response.choices[0].message.tool_calls[0]
        output_data = json.loads(tool_call.function.arguments)

    elif OPERATION_MODE == "update":
        print("Operation Mode: UPDATE. Starting data modification...", file=sys.stderr)

        USER_PROMPT = payload.get("user_prompt")
        SYSTEM_PROMPT = payload.get("system_prompt")
        EXISTING_DATA_JSON = payload.get("existing_data_json")
        if not all([USER_PROMPT, SYSTEM_PROMPT, EXISTING_DATA_JSON]):
            raise ValueError("One or more required fields for 'update' mode are missing from input.json.")

        update_prompt = f"""
        Here is the current table of extracted data in JSON format:
        {EXISTING_DATA_JSON}

        A user has provided the following instruction to correct this data:
        "{USER_PROMPT}"

        Your task is to analyze the user's INTENT and modify the existing data accordingly.
        This includes:
        - Adding new products or details if explicitly mentioned.
        - Updating existing fields for products (e.g., "change price of X to Y").
        - Removing entire products if the user explicitly requests (e.g., "remove product 'X'", "delete the item 'Y'").
        - Removing specific details from a product (e.g., "remove the description of product 'Z'", "clear price for 'A'").
        
        When removing a product, remove its entire object from the 'products' array.
        When removing a specific detail, set that field's value to null or remove the key if appropriate.

        Preserve all other data that was not mentioned.
        Return the complete, corrected data structure by calling the 'updateProductData' tool.
        """

        api_response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": update_prompt}
            ],
            tools=[{
                "type": "function",
                "function": {
                    "name": "updateProductData",
                    "description": "Saves the modified and corrected structured data for the products.",
                    "parameters": PRODUCT_DATA_SCHEMA
                }
            }],
            tool_choice={"type": "function", "function": {"name": "updateProductData"}}
        )
        print("OpenAI API call for update completed.", file=sys.stderr)
        tool_call = api_response.choices[0].message.tool_calls[0]
        output_data = json.loads(tool_call.function.arguments)

    elif OPERATION_MODE == "finalize":
        print("Operation Mode: FINALIZE. Preparing final JSON data...", file=sys.stderr)
        
        FINAL_DATA_JSON = payload.get("final_data_json")
        if not FINAL_DATA_JSON:
            raise ValueError("The 'final_data_json' field is missing from input.json for 'finalize' mode.")

        final_data_from_input = json.loads(FINAL_DATA_JSON)
        if "products" not in final_data_from_input:
            raise ValueError("No valid 'products' array found in final data for finalize operation.")
        
        output_data = final_data_from_input
        print("Final JSON data prepared for output.", file=sys.stderr)

    else:
        raise ValueError(f"Unknown operation mode: {OPERATION_MODE}")

    print(json.dumps(output_data))

except Exception as e:
    print(f"An error occurred in the Python script: {e}", file=sys.stderr)
    raise e