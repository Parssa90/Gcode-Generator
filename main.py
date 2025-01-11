import json
from math import ceil
from tkinter import Tk, Toplevel, Label, Button, Entry, StringVar, messagebox, ttk


# Helper Functions for Data Management
def load_data(file_path):
    try:
        with open(file_path, 'r') as file:
            return json.load(file)
    except FileNotFoundError:
        return []


def save_data(file_path, data):
    with open(file_path, 'w') as file:
        json.dump(data, file, indent=4)


def calculate_spindle_speed(diameter):
    cutting_speed = 100  # Default m/min
    return ceil((cutting_speed * 1000) / (3.1416 * diameter))


def calculate_feed_rate(diameter, chip_thickness=0.15, inserts=4):
    spindle_speed = calculate_spindle_speed(diameter)
    return ceil(spindle_speed * chip_thickness * inserts)


# Main Application Class
class GCodeApp:
    def __init__(self, root):
        self.root = root
        self.root.title("GCode Generator")

        # File Paths
        self.tools_file = "tools.json"
        self.risers_file = "risers.json"
        self.parts_file = "parts.json"

        # Load Data
        self.tools = load_data(self.tools_file)
        self.risers = load_data(self.risers_file)
        self.parts = load_data(self.parts_file)

        # UI Setup
        self.setup_ui()

    def setup_ui(self):
        # Tabs
        self.notebook = ttk.Notebook(self.root)
        self.parts_tab = ttk.Frame(self.notebook)
        self.tools_tab = ttk.Frame(self.notebook)
        self.risers_tab = ttk.Frame(self.notebook)
        self.output_tab = ttk.Frame(self.notebook)

        self.notebook.add(self.parts_tab, text="Parts")
        self.notebook.add(self.tools_tab, text="Tools")
        self.notebook.add(self.risers_tab, text="Risers")
        self.notebook.add(self.output_tab, text="Output")
        self.notebook.pack(expand=1, fill="both")

        # Parts Tab
        self.setup_table(self.parts_tab, "Parts")
        # Tools Tab
        self.setup_table(self.tools_tab, "Tools")
        # Risers Tab
        self.setup_table(self.risers_tab, "Risers")
        # Output Tab
        self.setup_output_tab()

    def setup_table(self, tab, label):
        Label(tab, text=f"{label} Table", font=("Arial", 14)).pack(pady=10)

        # Table
        columns = ("Name", "Dimension", "Tools", "Worktime", "Riser")
        self.table = ttk.Treeview(tab, columns=columns, show='headings')
        for col in columns:
            self.table.heading(col, text=col)
            self.table.column(col, width=100)
        self.table.pack(expand=1, fill="both", pady=10)

        # Buttons
        btn_frame = ttk.Frame(tab)
        btn_frame.pack(pady=10)

        self.add_btn = Button(btn_frame, text="Add", command=lambda: self.open_add_popup(label))
        self.add_btn.grid(row=0, column=0, padx=10)

        self.edit_btn = Button(btn_frame, text="Edit", state="disabled", command=self.edit_entry)
        self.edit_btn.grid(row=0, column=1, padx=10)

        self.remove_btn = Button(btn_frame, text="Remove", state="disabled", command=self.remove_entry)
        self.remove_btn.grid(row=0, column=2, padx=10)

    def setup_output_tab(self):
        Label(self.output_tab, text="GCode Output", font=("Arial", 14)).pack(pady=10)

        self.output_box = Text(self.output_tab, wrap="none", font=("Courier", 10))
        self.output_box.pack(expand=1, fill="both", pady=10)

        self.copy_btn = Button(self.output_tab, text="Copy to Clipboard", command=self.copy_output)
        self.copy_btn.pack(pady=10)

    def open_add_popup(self, label):
        popup = Toplevel(self.root)
        popup.title(f"Add New {label}")
        Label(popup, text=f"Add New {label}", font=("Arial", 14)).pack(pady=10)

        # Add fields based on label
        if label == "Parts":
            self.add_part_fields(popup)
        elif label == "Tools":
            self.add_tool_fields(popup)
        elif label == "Risers":
            self.add_riser_fields(popup)

        Button(popup, text="Cancel", command=popup.destroy).pack(pady=10)

    def add_part_fields(self, popup):
        Label(popup, text="Part Name (4-6 digits):").pack()
        self.part_name = Entry(popup)
        self.part_name.pack()

        Label(popup, text="Dimensions (X,Y,Z in mm):").pack()
        self.part_dims = Entry(popup)
        self.part_dims.pack()

    def add_tool_fields(self, popup):
        Label(popup, text="Tool Name:").pack()
        self.tool_name = Entry(popup)
        self.tool_name.pack()

        Label(popup, text="Tool Diameter (mm):").pack()
        self.tool_diameter = Entry(popup)
        self.tool_diameter.pack()

    def add_riser_fields(self, popup):
        Label(popup, text="Riser Name:").pack()
        self.riser_name = Entry(popup)
        self.riser_name.pack()

    def copy_output(self):
        self.root.clipboard_clear()
        self.root.clipboard_append(self.output_box.get("1.0", "end-1c"))
        messagebox.showinfo("Copied", "Output copied to clipboard!")

    def remove_entry(self):
        selected_item = self.table.selection()
        if selected_item:
            self.table.delete(selected_item)


# Main Program
if __name__ == "__main__":
    root = Tk()
    app = GCodeApp(root)
    root.mainloop()
