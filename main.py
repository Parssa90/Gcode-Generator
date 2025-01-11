import tkinter as tk
from tkinter import ttk, messagebox
import math

# Global list for risers
risers = []


# Function to calculate step-downs
def calculate_stepdowns(depth):
    max_step = 0.8
    min_step = 0.1
    last_pass = 0.1

    steps = []
    remaining_depth = depth - last_pass

    while remaining_depth > max_step:
        steps.append(max_step)
        remaining_depth -= max_step

    if remaining_depth > min_step:
        steps.append(remaining_depth)

    steps.append(last_pass)
    return steps


# Function to generate G-code for riser cutting
def generate_riser_gcode():
    riser_gcode = []
    for riser in risers:
        name, diameter, height, x_center, y_center = riser
        radius = diameter / 2
        riser_gcode.append(f"(Riser: {name})")
        riser_gcode.append(f"G00 Z{height + 10} ; Safe height above riser")
        riser_gcode.append(f"G00 X{x_center:.2f} Y{y_center + radius + 10:.2f}")
        riser_gcode.append(f"G01 Z0 F500 ; Cutting riser at full width")
        riser_gcode.append(f"G01 Y{y_center - radius - 10:.2f}")
        riser_gcode.append(f"G00 Z{height + 10} ; Retract to safe height")
        riser_gcode.append("")
    return riser_gcode


# Function to generate G-code for part cutting
def generate_gcode(part_number_entry=None, num_parts_var=None, x_entry=None, y_entry=None, z_entry=None,
                   cutter_var=None, depth_entry=None, gcode_text=None):
    try:
        part_number = int(part_number_entry.get())
        num_parts = int(num_parts_var.get())
        x = float(x_entry.get())
        y = float(y_entry.get())
        z = float(z_entry.get())
        cutter_diameter = 88 if "88mm" in cutter_var.get() else 148
        depth = float(depth_entry.get())

        if depth < 1 or depth > 10:
            raise ValueError("Cutting depth must be between 1 and 10mm.")

    except ValueError as e:
        messagebox.showerror("Input Error", str(e))
        return

    stepdowns = calculate_stepdowns(depth)
    gcode = [f"O{part_number}"]
    gcode.append(f"(Generated G-code for {num_parts} part(s))")
    gcode.append("G40 G80 G90 G94 G17 ; Initialization")
    gcode.append("G21 ; Metric Units")
    gcode.append("G00 Z9999. ; Safe retract")

    if num_parts == 1:
        center_offset = x / 2 + 0.3 * cutter_diameter
        gcode.append(f"(Single part cutting)")
        gcode.append(f"G00 X{center_offset:.2f} Y{y / 2 + 10:.2f}")
    else:
        closer_part = 160 + x + 0.3 * cutter_diameter
        far_part = -160 + 0.3 * cutter_diameter
        gcode.append(f"(Closer part at {closer_part:.2f}, Far part at {far_part:.2f})")

    for step in stepdowns:
        gcode.append(f"(Step-down to {step:.2f}mm)")
        gcode.append(f"G01 Z-{step:.2f} F500 ; Cutting pass")
        gcode.append(f"G00 Z9999. ; Retract")

    # Add riser G-code
    gcode.extend(generate_riser_gcode())

    gcode.append("M05 ; Stop spindle")
    gcode.append("M02 ; End of program")

    # Show G-code
    gcode_text.delete("1.0", tk.END)
    gcode_text.insert(tk.END, "\n".join(gcode))


# GUI for Riser Page
def add_riser():
    def save_riser():
        name = riser_name_entry.get()
        diameter = float(riser_diameter_entry.get())
        height = float(riser_height_entry.get())
        x_center = float(riser_x_entry.get())
        y_center = float(riser_y_entry.get())
        risers.append((name, diameter, height, x_center, y_center))
        update_riser_table()
        add_riser_window.destroy()

    add_riser_window = tk.Toplevel(root)
    add_riser_window.title("Add Riser")
    tk.Label(add_riser_window, text="Riser Name:").grid(row=0, column=0)
    tk.Label(add_riser_window, text="Diameter:").grid(row=1, column=0)
    tk.Label(add_riser_window, text="Height:").grid(row=2, column=0)
    tk.Label(add_riser_window, text="X Center:").grid(row=3, column=0)
    tk.Label(add_riser_window, text="Y Center:").grid(row=4, column=0)

    riser_name_entry = tk.Entry(add_riser_window)
    riser_name_entry.grid(row=0, column=1)
    riser_diameter_entry = tk.Entry(add_riser_window)
    riser_diameter_entry.grid(row=1, column=1)
    riser_height_entry = tk.Entry(add_riser_window)
    riser_height_entry.grid(row=2, column=1)
    riser_x_entry = tk.Entry(add_riser_window)
    riser_x_entry.grid(row=3, column=1)
    riser_y_entry = tk.Entry(add_riser_window)
    riser_y_entry.grid(row=4, column=1)

    tk.Button(add_riser_window, text="Save", command=save_riser).grid(row=5, column=0, columnspan=2)


def update_riser_table(riser_tree=None):
    riser_tree.delete(*riser_tree.get_children())
    for i, riser in enumerate(risers, start=1):
        riser_tree.insert("", "end", iid=i, values=riser)


# Run the full GUI
root = tk.Tk()
root.title("CNC G-code Generator")
# Add Riser Page and other pages to the GUI here.

root.mainloop()
