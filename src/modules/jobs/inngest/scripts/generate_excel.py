# src/modules/jobs/inngest/scripts/generate_excel.py

import sys
import json
import openpyxl

try:
    # Read the JSON data from standard input (stdin).
    # This is how we receive data from the previous script.
    print("Starting Excel generation process...", file=sys.stderr)
    input_data = sys.stdin.read()
    data = json.loads(input_data)
    products = data.get('products', [])
    print(f"Received {len(products)} products to format into Excel.", file=sys.stderr)

    # Create a new Excel workbook and select the active sheet
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Extracted Products"

    # Define and write the headers for the columns
    headers = ["Name", "Description", "Price", "Limit"]
    ws.append(headers)

    # Loop through the products and write each one as a new row
    for product in products:
        row = [
            product.get('name', ''),
            product.get('description', ''),
            product.get('price', ''),
            product.get('limit', '')
        ]
        ws.append(row)
    
    # Save the Excel file to a temporary path inside the sandbox
    output_filename = "/tmp/extracted_data.xlsx"
    wb.save(output_filename)
    print(f"Excel file saved to {output_filename}", file=sys.stderr)

    # The final, machine-readable output is the PATH to the file.
    # This is what the Inngest function will ultimately receive.
    print(output_filename)

except Exception as e:
    print(f"An error occurred in the Excel generation script: {e}", file=sys.stderr)
    raise e