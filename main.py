import csv
import os
import math

# File paths for CSV storage
TOOLS_FILE = "tools.csv"
PARTS_FILE = "parts.csv"
RISERS_FILE = "risers.csv"

# Ensure files exist with headers
def initialize_csv(file_path, headers):
    if not os.path.exists(file_path):
        with open(file_path, mode="w", newline="") as file:
            writer = csv.DictWriter(file, fieldnames=headers)
            writer.writeheader()

# Save data to CSV
def save_to_csv(file_path, data, headers):
    with open(file_path, mode="w", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=headers)
        writer.writeheader()
        writer.writerows(data)

# Load data from CSV
def load_from_csv(file_path, headers):
    try:
        with open(file_path, mode="r") as file:
            reader = csv.DictReader(file)
            return [dict(row) for row in reader]
    except FileNotFoundError:
        return []

# Check for unique name
def is_unique_name(name, data, key):
    return all(entry[key] != name for entry in data)

# Calculate spindle speed and feed rate
def calculate_spindle_feed(diameter, inserts):
    spindle_speed = round((120 * 1000) / (math.pi * diameter))  # RPM
    feed_rate = round(spindle_speed * 0.2 * inserts)  # mm/min
    return spindle_speed, feed_rate

# Add Tool
def add_tool(tools):
    print("\n--- Add Tool ---")
    name = input("Enter tool name: ").strip()
    if not is_unique_name(name, tools, "name"):
        print("Error: Tool name must be unique!")
        return

    try:
        diameter = float(input("Enter tool diameter (1-200 mm): "))
        if not (1 <= diameter <= 200):
            raise ValueError("Diameter out of range.")

        inserts = int(input("Enter number of inserts (1-24): "))
        if not (1 <= inserts <= 24):
            raise ValueError("Number of inserts out of range.")

        spindle_speed, feed_rate = calculate_spindle_feed(diameter, inserts)
        print(f"Suggested Spindle Speed: {spindle_speed} RPM")
        print(f"Suggested Feed Rate: {feed_rate} mm/min")

        if input("Are you happy with these values? (yes/no): ").strip().lower() != "yes":
            spindle_speed = int(input("Enter custom Spindle Speed (RPM): "))
            feed_rate = int(input("Enter custom Feed Rate (mm/min): "))

        tool_number = int(input("Enter tool number (1-10): "))
        if not (1 <= tool_number <= 10):
            raise ValueError("Tool number out of range.")

        length = float(input("Enter tool length (mm): "))
        if length <= 0:
            raise ValueError("Tool length must be positive.")

        tools.append({
            "name": name,
            "diameter": diameter,
            "inserts": inserts,
            "spindle_speed": spindle_speed,
            "feed_rate": feed_rate,
            "tool_number": tool_number,
            "length": length
        })
        print("Tool added successfully!")

    except ValueError as e:
        print(f"Error: {e}")

# Add Part
def add_part(parts, tools, risers):
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

    try:
        dimension_x = float(input("Enter part dimension X (10-450 mm): "))
        dimension_y = float(input("Enter part dimension Y (10-450 mm): "))
        cut_depth = float(input("Enter total cut depth (1-10 mm): "))
        if not (1 <= cut_depth <= 10):
            raise ValueError("Cut depth out of range.")
        if not (10 <= dimension_x <= 450) or not (10 <= dimension_y <= 450):
            raise ValueError("Dimensions out of range.")

        print("\nAvailable Tools:")
        for idx, tool in enumerate(tools, start=1):
            print(f"{idx}. {tool['name']} (Diameter: {tool['diameter']} mm)")
        tool_choice = int(input("Enter the number of the tool to use: "))
        if not (1 <= tool_choice <= len(tools)):
            raise ValueError("Invalid tool selection.")

        has_riser = input("Does this part have a riser? (yes/no): ").strip().lower()
        riser = None
        if has_riser == "yes":
            if not risers:
                print("Error: Add risers before assigning to parts!")
                return
            print("\nAvailable Risers:")
            for idx, riser_item in enumerate(risers, start=1):
                print(f"{idx}. {riser_item['name']} (Height: {riser_item['height']} mm)")
            riser_choice = int(input("Enter the number of the riser to use: "))
            if not (1 <= riser_choice <= len(risers)):
                raise ValueError("Invalid riser selection.")
            riser = risers[riser_choice - 1]["name"]

        parts.append({
            "name": name,
            "dimension_x": dimension_x,
            "dimension_y": dimension_y,
            "tool": tools[tool_choice - 1]["name"],
            "riser": riser,
            "cut_depth": cut_depth
        })
        print("Part added successfully!")
    except ValueError as e:
        print(f"Error: {e}")

# Add Riser
def add_riser(risers):
    print("\n--- Add Riser ---")
    name = input("Enter riser name: ").strip()
    if not is_unique_name(name, risers, "name"):
        print("Error: Riser name must be unique!")
        return

    try:
        center_x = float(input("Enter riser center X: "))
        center_y = float(input("Enter riser center Y: "))
        height = float(input("Enter riser height (mm): "))
        if height <= 0:
            raise ValueError("Riser height must be positive.")

        risers.append({
            "name": name,
            "center_x": center_x,
            "center_y": center_y,
            "height": height
        })
        print("Riser added successfully!")
    except ValueError as e:
        print(f"Error: {e}")

# Generate G-Code
def generate_gcode(parts, tools, risers):
    print("\n--- Generate G-Code ---")
    # Implement G-Code generation logic here (as in previous detailed example)

# Main Program
def main():
    initialize_csv(TOOLS_FILE, ["name", "diameter", "inserts", "spindle_speed", "feed_rate", "tool_number", "length"])
    initialize_csv(PARTS_FILE, ["name", "dimension_x", "dimension_y", "tool", "riser", "cut_depth"])
    initialize_csv(RISERS_FILE, ["name", "center_x", "center_y", "height"])

    tools = load_from_csv(TOOLS_FILE, ["name", "diameter", "inserts", "spindle_speed", "feed_rate", "tool_number", "length"])
    parts = load_from_csv(PARTS_FILE, ["name", "dimension_x", "dimension_y", "tool", "riser", "cut_depth"])
    risers = load_from_csv(RISERS_FILE, ["name", "center_x", "center_y", "height"])

    while True:
        print("\n--- CNC G-Code Generator ---")
        print("1. Add Tool")
        print("2. Add Part")
        print("3. Add Riser")
        print("4. Generate G-Code")
        print("5. Exit")
        choice = input("Select an option: ").strip()

        if choice == "1":
            add_tool(tools)
            save_to_csv(TOOLS_FILE, tools, ["name", "diameter", "inserts", "spindle_speed", "feed_rate", "tool_number", "length"])
        elif choice == "2":
            add_part(parts, tools, risers)
            save_to_csv(PARTS_FILE, parts, ["name", "dimension_x", "dimension_y", "tool", "riser", "cut_depth"])
        elif choice == "3":
            add_riser(risers)
            save_to_csv(RISERS_FILE, risers, ["name", "center_x", "center_y", "height"])
        elif choice == "4":
            generate_gcode(parts, tools, risers)
        elif choice == "5":
            print("Exiting program.")
            break
        else:
            print("Invalid choice. Please try again.")

if __name__ == "__main__":
    main()
