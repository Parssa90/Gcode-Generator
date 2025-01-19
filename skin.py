import tkinter as tk
from tkinter import ttk, messagebox
from main import generate_gcode, generate_gcode_two, load_from_csv, save_to_csv

# File Paths
TOOLS_FILE = "tools.csv"
PARTS_FILE = "parts.csv"
RISERS_FILE = "risers.csv"

# Load existing data
tools = load_from_csv(TOOLS_FILE)
parts = load_from_csv(PARTS_FILE)
risers = load_from_csv(RISERS_FILE)


def add_tool():
    name = tool_name.get()
    diameter = tool_diameter.get()
    inserts = tool_inserts.get()
    tool_number = tool_num.get()
    length = tool_length.get()

    if not name or not diameter or not inserts or not tool_number or not length:
        messagebox.showerror("Error", "Please fill all fields")
        return

    new_tool = {
        "name": name,
        "diameter": float(diameter),
        "inserts": int(inserts),
        "tool_number": int(tool_number),
        "length": float(length)
    }
    tools.append(new_tool)
    save_to_csv(TOOLS_FILE, tools, ["name", "diameter", "inserts", "tool_number", "length"])
    messagebox.showinfo("Success", "Tool added successfully")
    tool_list.insert("", "end", values=(name, diameter, inserts, tool_number, length))


def generate_gcode_ui(parts_data):
    if not parts_data:
        messagebox.showerror("Error", "No parts available")
        return
    generate_gcode(parts_data, tools, risers)
    messagebox.showinfo("Success", "G-code generated for one part")


def generate_gcode_two_ui(parts_data):
    if not parts_data:
        messagebox.showerror("Error", "No parts available")
        return
    generate_gcode_two(parts_data, tools, risers)
    messagebox.showinfo("Success", "G-code generated for two parts")


# Create the main window
root = tk.Tk()
root.title("G-Code Generator")
root.geometry("800x600")

# Tabs
notebook = ttk.Notebook(root)
notebook.pack(expand=True, fill="both")

# Tool Management Tab
tool_frame = ttk.Frame(notebook)
notebook.add(tool_frame, text="Tools")

ttk.Label(tool_frame, text="Tool Name:").grid(row=0, column=0)
tool_name = tk.StringVar()
ttk.Entry(tool_frame, textvariable=tool_name).grid(row=0, column=1)

ttk.Label(tool_frame, text="Diameter:").grid(row=1, column=0)
tool_diameter = tk.DoubleVar()
ttk.Entry(tool_frame, textvariable=tool_diameter).grid(row=1, column=1)

ttk.Label(tool_frame, text="Inserts:").grid(row=2, column=0)
tool_inserts = tk.IntVar()
ttk.Entry(tool_frame, textvariable=tool_inserts).grid(row=2, column=1)

ttk.Label(tool_frame, text="Tool Number:").grid(row=3, column=0)
tool_num = tk.IntVar()
ttk.Entry(tool_frame, textvariable=tool_num).grid(row=3, column=1)

ttk.Label(tool_frame, text="Length:").grid(row=4, column=0)
tool_length = tk.DoubleVar()
ttk.Entry(tool_frame, textvariable=tool_length).grid(row=4, column=1)

ttk.Button(tool_frame, text="Add Tool", command=add_tool).grid(row=5, columnspan=2)

# Tool List Display
tool_list = ttk.Treeview(tool_frame, columns=("Name", "Diameter", "Inserts", "Tool Number", "Length"), show="headings")
tool_list.heading("Name", text="Name")
tool_list.heading("Diameter", text="Diameter")
tool_list.heading("Inserts", text="Inserts")
tool_list.heading("Tool Number", text="Tool Number")
tool_list.heading("Length", text="Length")
tool_list.grid(row=6, columnspan=2)

for tool in tools:
    tool_list.insert("", "end",
                     values=(tool["name"], tool["diameter"], tool["inserts"], tool["tool_number"], tool["length"]))

# Part Management Tab
part_frame = ttk.Frame(notebook)
notebook.add(part_frame, text="Parts")

ttk.Button(part_frame, text="Generate G-Code (1 Part)", command=lambda: generate_gcode_ui(parts)).grid(row=0, column=0)
ttk.Button(part_frame, text="Generate G-Code (2 Parts)", command=lambda: generate_gcode_two_ui(parts)).grid(row=0,
                                                                                                            column=1)

# Main Loop
root.mainloop()
