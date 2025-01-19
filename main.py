import csv
import os
import math

from generate_gcode import generate_gcode  # For one part on the table
from generate_gcode_two import generate_gcode_two  # For two parts on the table


def load_and_convert_csv(file_path: str, conversion_map: dict) -> list[dict]:
    """
    Load CSV and convert specified fields to their respective types.
    :param file_path: Path to the CSV file.
    :param conversion_map: A dictionary mapping field names to types (e.g., {"diameter": float}).
    :return: List of dictionaries with converted values.
    """
    data = load_from_csv(file_path)
    for row in data:
        for key, value_type in conversion_map.items():
            if key in row and row[key] != '':
                try:
                    row[key] = value_type(row[key])
                except ValueError:
                    print(f"Warning: Could not convert {key} to {value_type}. Value: {row[key]}")
    return data


# File paths
TOOLS_FILE = "tools.csv"
PARTS_FILE = "parts.csv"
RISERS_FILE = "risers.csv"

# Initialize CSV Headers
TOOL_HEADERS = ["name", "diameter", "inserts", "tool_number", "length", "spindle_speed", "feed_rate"]
PART_HEADERS = ["name", "dimension_x", "dimension_y", "cut_depth", "table", "tool", "riser"]
RISER_HEADERS = ["name", "diameter", "center_x", "center_y", "height"]


# ----------------------------
# CSV File Management
# ----------------------------

def initialize_csv(file_path, headers):
    """Ensure CSV file exists with given headers."""
    if not os.path.exists(file_path):
        with open(file_path, mode="w", newline="") as file:
            writer = csv.DictWriter(file, fieldnames=headers)
            writer.writeheader()


def save_to_csv(file_path, data, headers):
    """Save data (list of dictionaries) to CSV."""
    with open(file_path, mode="w", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=headers)
        writer.writeheader()
        writer.writerows(data)


def load_from_csv(file_path: str) -> list[dict]:
    """Load data (list of dictionaries) from CSV."""
    if not os.path.exists(file_path):
        return []  # Return an empty list if the file doesn't exist
    with open(file_path, mode="r") as file:
        reader = csv.DictReader(file)
        return [dict(row) for row in reader]


# ----------------------------
# Helper Functions
# ----------------------------

def is_unique_name(name, data, key):
    """Check if 'name' is unique in 'data' under the given 'key'."""
    return all(entry[key] != name for entry in data)


def calculate_spindle_feed(diameter, inserts):
    """Calculate spindle speed and feed rate based on diameter and inserts."""
    spindle_speed = round((120 * 1000) / (math.pi * diameter))  # Surface speed: 120 m/min
    feed_rate = round(spindle_speed * 0.2 * inserts)  # Chip thickness: 0.2 mm
    return spindle_speed, feed_rate


def validate_float(prompt, min_val, max_val):
    """Prompt user for a float within the specified range."""
    while True:
        try:
            value = float(input(prompt))
            if min_val <= value <= max_val:
                return value
            print(f"Error: Value must be between {min_val} and {max_val}.")
        except ValueError:
            print("Error: Please enter a valid number.")


def validate_int(prompt, min_val, max_val):
    """Prompt user for an integer within the specified range."""
    while True:
        try:
            value = int(input(prompt))
            if min_val <= value <= max_val:
                return value
            print(f"Error: Value must be between {min_val} and {max_val}.")
        except ValueError:
            print("Error: Please enter a valid number.")


# ----------------------------
# Tool, Part, Riser Management
# ----------------------------

def add_tool(tools: list[dict]) -> None:
    """Add a new tool to the tools list."""
    print("\n--- Add Tool ---")
    name = input("Enter tool name: ").strip()
    if not is_unique_name(name, tools, "name"):
        print("Error: Tool name must be unique!")
        return

    diameter = validate_float("Enter tool diameter (1-200 mm): ", 1, 200)
    inserts = validate_int("Enter number of inserts (1-24): ", 1, 24)
    tool_number = validate_int("Enter tool number (1-10): ", 1, 10)
    length = validate_float("Enter tool length (mm): ", 100, 250)

    spindle_speed, feed_rate = calculate_spindle_feed(diameter, inserts)
    print(f"Suggested Spindle Speed: {spindle_speed} RPM")
    print(f"Suggested Feed Rate: {feed_rate} mm/min")
    if input("Are you happy with these values? (yes/no): ").strip().lower() != "yes":
        spindle_speed = validate_int("Enter custom Spindle Speed (RPM): ", 1, 100000)
        feed_rate = validate_int("Enter custom Feed Rate (mm/min): ", 1, 100000)

    tools.append({
        "name": name,
        "diameter": diameter,
        "inserts": inserts,
        "tool_number": tool_number,
        "length": length,
        "spindle_speed": spindle_speed,
        "feed_rate": feed_rate
    })
    print("Tool added successfully!")


def add_riser(risers: list[dict]) -> None:
    print("\n--- Add Riser ---")
    name = input("Enter riser name: ").strip()
    if not is_unique_name(name, risers, "name"):
        print("Error: Riser name must be unique!")
        return

    center_x = validate_float("Enter riser center X: ", -200, 200)
    center_y = validate_float("Enter riser center Y: ", -200, 200)
    height = validate_float("Enter riser height: ", 5, 100)
    diameter = validate_float("Enter riser diameter: ", 20, 200)

    risers.append({
        "name": name,
        "diameter": diameter,
        "center_x": center_x,
        "center_y": center_y,
        "height": height
    })
    print("Riser added successfully!")


def add_part(parts: list[dict], tools: list[dict], risers: list[dict]) -> None:
    if not tools:
        print("Error: Add tools before adding parts!")
        return

    print("\n--- Add Part ---")
    name = input("Enter part name (4-6 digit number): ").strip()
    if not name.isdigit() or not (1000 <= int(name) <= 999999):
        print("Error: Part name must be a 4-6 digit number!")
        return
    if not is_unique_name(name, parts, "name"):
        print("Error: Part name must be unique!")
        return

    dimension_x = validate_float("Enter part dimension X (10-450 mm): ", 10, 450)
    dimension_y = validate_float("Enter part dimension Y (10-450 mm): ", 10, 450)
    cut_depth = validate_float("Enter total cut depth (1-10 mm): ", 1, 10)
    table = validate_int("How many parts on the table? (1 or 2): ", 1, 2)

    print("\nAvailable Tools:")
    for idx, tool in enumerate(tools, start=1):
        print(f"{idx}. {tool['name']} (Diameter: {tool['diameter']} mm, Tool#{tool['tool_number']})")
    tool_choice = validate_int("Select a tool by number: ", 1, len(tools))
    selected_tool = tools[tool_choice - 1]["name"]

    riser_name = None
    if input("Does this part have a riser? (yes/no): ").strip().lower() == "yes":
        if not risers:
            print("Error: Add risers before assigning to parts!")
            return
        print("\nAvailable Risers:")
        for idx, riser in enumerate(risers, start=1):
            print(f"{idx}. {riser['name']} (Height={riser['height']} mm)")
        riser_choice = validate_int("Select a riser by number: ", 1, len(risers))
        riser_name = risers[riser_choice - 1]["name"]

    parts.append({
        "name": name,
        "dimension_x": dimension_x,
        "dimension_y": dimension_y,
        "cut_depth": cut_depth,
        "table": table,
        "tool": selected_tool,
        "riser": riser_name
    })
    print("Part added successfully!")


# ----------------------------
# Main Menu
# ----------------------------

def main():
    initialize_csv(TOOLS_FILE, TOOL_HEADERS)
    initialize_csv(PARTS_FILE, PART_HEADERS)
    initialize_csv(RISERS_FILE, RISER_HEADERS)

    # Define type conversions for each CSV file
    tool_conversion_map = {
        "diameter": float,
        "inserts": int,
        "tool_number": int,
        "length": float,
        "spindle_speed": float,
        "feed_rate": float
    }
    part_conversion_map = {
        "dimension_x": float,
        "dimension_y": float,
        "cut_depth": float,
        "table": int
    }
    riser_conversion_map = {
        "diameter": float,
        "center_x": float,
        "center_y": float,
        "height": float
    }

    # Load and convert data
    tools = load_and_convert_csv(TOOLS_FILE, tool_conversion_map)
    parts = load_and_convert_csv(PARTS_FILE, part_conversion_map)
    risers = load_and_convert_csv(RISERS_FILE, riser_conversion_map)

    while True:
        print("\n--- MAIN MENU ---")
        print("1) Add Tool")
        print("2) Add Riser")
        print("3) Add Part")
        print("4) Generate G-Code for One Part on Table")
        print("5) Generate G-Code for Two Parts on Table")
        print("6) Exit")
        choice = input("Enter your choice: ").strip()

        if choice == "1":
            add_tool(tools)
            save_to_csv(TOOLS_FILE, tools, TOOL_HEADERS)
        elif choice == "2":
            add_riser(risers)
            save_to_csv(RISERS_FILE, risers, RISER_HEADERS)
        elif choice == "3":
            add_part(parts, tools, risers)
            save_to_csv(PARTS_FILE, parts, PART_HEADERS)
        elif choice == "4":
            generate_gcode(parts, tools, risers)
        elif choice == "5":
            generate_gcode_two(parts, tools, risers)
        elif choice == "6":
            print("Exiting program.")
            break
        else:
            print("Invalid choice! Please try again.")


if __name__ == "__main__":
    main()
