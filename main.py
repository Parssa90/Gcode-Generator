import sys
import os
import json
from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QTabWidget, QVBoxLayout, QTableWidget, QTableWidgetItem,
    QPushButton, QWidget, QLineEdit, QLabel, QHBoxLayout, QDialog, QTextEdit, QComboBox, QScrollArea, QMessageBox
)
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QColor

class AddItemPopup(QDialog):
    def __init__(self, fields, parent=None, dropdown_data=None):
        super().__init__(parent)
        self.setWindowTitle("Add Item")
        self.fields = fields
        self.inputs = {}
        self.resize(400, 400)
        self.dropdown_data = dropdown_data or {}

        scroll_area = QScrollArea()
        scroll_widget = QWidget()
        layout = QVBoxLayout()

        form_layout = QVBoxLayout()
        for field in fields:
            if field == "Dimension":
                label = QLabel(f"{field} (X,Y)")
            elif field == "Center":
                label = QLabel(f"{field} (X,Y)")
            else:
                label = QLabel(field)

            if field == "Riser":
                input_field = QComboBox()
                input_field.addItems(["Yes", "No"])
            elif field == "Tools" and "Tools" in self.dropdown_data:
                input_field = QComboBox()
                input_field.addItems(self.dropdown_data["Tools"])
            else:
                input_field = QLineEdit()
                if field == "Diameter" or field == "Number of Inserts":
                    input_field.textChanged.connect(self.calculate_defaults)
            form_layout.addWidget(label)
            form_layout.addWidget(input_field)
            self.inputs[field] = input_field

        scroll_widget.setLayout(form_layout)
        scroll_area.setWidget(scroll_widget)
        scroll_area.setWidgetResizable(True)

        button_layout = QHBoxLayout()
        save_button = QPushButton("Save")
        save_button.clicked.connect(self.validate_and_accept)
        cancel_button = QPushButton("Cancel")
        cancel_button.clicked.connect(self.reject)
        button_layout.addWidget(save_button)
        button_layout.addWidget(cancel_button)

        layout.addWidget(scroll_area)
        layout.addLayout(button_layout)
        self.setLayout(layout)

    def validate_and_accept(self):
        for field, input_field in self.inputs.items():
            if isinstance(input_field, QLineEdit) and field != "Spindle Speed" and field != "Feed Rate":
                if field == "Name" and not input_field.text().isdigit():
                    QMessageBox.critical(self, "Invalid Input", f"{field} must be a number.")
                    return
                elif field != "Name" and not input_field.text():
                    QMessageBox.critical(self, "Invalid Input", f"{field} cannot be empty.")
                    return
        self.accept()

    def get_data(self):
        return {field: (self.inputs[field].currentText() if isinstance(self.inputs[field], QComboBox) else self.inputs[field].text()) for field in self.fields}

    def calculate_defaults(self):
        try:
            diameter = float(self.inputs["Diameter"].text())
            inserts = int(self.inputs["Number of Inserts"].text())
            surface_speed = 150  # m/min
            chip_thickness = 0.2  # mm

            spindle_speed = int((surface_speed * 1000) / (3.14159 * diameter))
            feed_rate = int(spindle_speed * chip_thickness * inserts)

            self.inputs["Spindle Speed"].setText(str(spindle_speed))
            self.inputs["Feed Rate"].setText(str(feed_rate))
        except (ValueError, KeyError):
            # If diameter or inserts are not valid numbers, leave defaults blank
            self.inputs["Spindle Speed"].setText("")
            self.inputs["Feed Rate"].setText("")

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("G-Code Generator")
        self.setGeometry(100, 100, 1000, 700)

        self.icon_folder = "icons"
        self.data_folder = "data"
        self.ensure_folders_exist()

        self.tabs = QTabWidget()
        self.setCentralWidget(self.tabs)

        self.parts_tab = self.create_table_tab("Parts", ["Name", "Dimension", "Tools", "Riser"], "parts.json")
        self.tools_tab = self.create_table_tab("Tools", ["Tool Name", "Diameter", "Number of Inserts", "Spindle Speed", "Feed Rate"], "tools.json")
        self.risers_tab = self.create_table_tab("Risers", ["Riser Name", "Center", "Height"], "risers.json")
        self.output_tab = self.create_output_tab()

        self.tabs.addTab(self.parts_tab, "Parts")
        self.tabs.addTab(self.tools_tab, "Tools")
        self.tabs.addTab(self.risers_tab, "Risers")
        self.tabs.addTab(self.output_tab, "Output")

        self.tool_count = 0

    def ensure_folders_exist(self):
        if not os.path.exists(self.icon_folder):
            os.makedirs(self.icon_folder)
            with open(os.path.join(self.icon_folder, "README.txt"), "w") as f:
                f.write("Icon Naming Convention:\n")
                f.write("- parts.png: Icon for Parts\n")
                f.write("- tools.png: Icon for Tools\n")
                f.write("- risers.png: Icon for Risers\n")
                f.write("- output.png: Icon for Output\n")

        if not os.path.exists(self.data_folder):
            os.makedirs(self.data_folder)

    def create_table_tab(self, title, headers, filename):
        tab = QWidget()
        layout = QVBoxLayout()

        table = QTableWidget()
        table.setColumnCount(len(headers))
        table.setHorizontalHeaderLabels(headers)
        table.setEditTriggers(QTableWidget.NoEditTriggers)
        table.verticalHeader().setVisible(False)
        table.setStyleSheet("QTableWidget { font-size: 14px; } QHeaderView::section { background-color: lightgray; }")

        button_layout = QHBoxLayout()
        add_button = QPushButton("Add")
        add_button.clicked.connect(lambda: self.open_add_item_popup(headers, table, filename))
        edit_button = QPushButton("Edit")
        remove_button = QPushButton("Remove")
        remove_button.clicked.connect(lambda: self.remove_selected_row(table, filename))
        button_layout.addWidget(add_button)
        button_layout.addWidget(edit_button)
        button_layout.addWidget(remove_button)

        layout.addWidget(table)
        layout.addLayout(button_layout)
        tab.setLayout(layout)

        self.load_table_data(table, filename)

        return tab

    def open_add_item_popup(self, headers, table, filename):
        dropdown_data = {}
        if "Parts" in filename:
            tools_filepath = os.path.join(self.data_folder, "tools.json")
            if os.path.exists(tools_filepath):
                with open(tools_filepath, "r") as file:
                    tools_data = json.load(file)
                    dropdown_data["Tools"] = [row[0] for row in tools_data]  # Assuming Tool Name is the first column

            if not dropdown_data.get("Tools"):
                QMessageBox.critical(self, "Error", "You must add at least one tool before adding a part.")
                return

        popup = AddItemPopup(headers, self, dropdown_data)
        if popup.exec_() == QDialog.Accepted:
            data = popup.get_data()
            row_position = table.rowCount()
            table.insertRow(row_position)
            for col, header in enumerate(headers):
                table.setItem(row_position, col, QTableWidgetItem(data[header]))
            self.save_table_data(table, filename)

        if "Tools" in filename:
            self.tool_count += 1

    def remove_selected_row(self, table, filename):
        current_row = table.currentRow()
        if current_row != -1:
            table.removeRow(current_row)
            self.save_table_data(table, filename)

    def load_table_data(self, table, filename):
        filepath = os.path.join(self.data_folder, filename)
        if os.path.exists(filepath):
            with open(filepath, "r") as file:
                data = json.load(file)
                for row_data in data:
                    row_position = table.rowCount()
                    table.insertRow(row_position)
                    for col, value in enumerate(row_data):
                        table.setItem(row_position, col, QTableWidgetItem(value))

    def save_table_data(self, table, filename):
        filepath = os.path.join(self.data_folder, filename)
        data = []
        for row in range(table.rowCount()):
            row_data = []
            for col in range(table.columnCount()):
                item = table.item(row, col)
                row_data.append(item.text() if item else "")
            data.append(row_data)
        with open(filepath, "w") as file:
            json.dump(data, file)

    def create_output_tab(self):
        tab = QWidget()
        layout = QVBoxLayout()

        self.output_box = QTextEdit()
        self.output_box.setReadOnly(True)
        self.output_box.setStyleSheet("QTextEdit { background-color: #f0f0f0; font-size: 14px; }")
        layout.addWidget(self.output_box)

        generate_button = QPushButton("Generate G-Code")
        generate_button.clicked.connect(self.generate_gcode)
        layout.addWidget(generate_button)

        tab.setLayout(layout)
        return tab

    def generate_gcode(self):
        # Placeholder G-Code generation logic
        commands = [
            "N001 G90 G21 (Set to Absolute Positioning in mm)",
            "N002 G17 (Select XY Plane)",
            "N003 M06 T1 (Tool Change to Tool 1)",
            "N004 G00 Z10 (Move to Safe Height)",
            "N005 G01 X0 Y0 Z-5 F200 (Cut to Position)",
            "N006 M30 (End of Program)",
        ]

        colored_gcode = ""
        for command in commands:
            if "G00" in command:
                colored_gcode += f"<span style='color:red;'>{command}</span><br>"
            elif "G01" in command:
                colored_gcode += f"<span style='color:green;'>{command}</span><br>"
            elif "M06" in command or "M30" in command:
                colored_gcode += f"<span style='color:blue;'>{command}</span><br>"
            else:
                colored_gcode += f"{command}<br>"

        self.output_box.setHtml(colored_gcode)

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec_())
