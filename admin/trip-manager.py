#!/usr/bin/env python3
"""
🏔️ Team Weekend Trekkers - Trip Manager
=========================================
A beautiful GUI admin panel for managing trips.
Run: python3 trip-manager.py
"""

import tkinter as tk
from tkinter import ttk, messagebox, filedialog, colorchooser
import json
import re
import os
import shutil
import calendar
import subprocess
import threading
from datetime import datetime, timedelta

# Configuration
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
TRIPS_DATA_FILE = os.path.join(PROJECT_ROOT, "js", "trips-data.js")
FEATURED_TRIPS_FILE = os.path.join(PROJECT_ROOT, "js", "featured-trips.js")
IMAGES_DIR = os.path.join(PROJECT_ROOT, "images", "trips")

# HTML files that load trips-data.js (for cache-busting)
HTML_FILES = [
    os.path.join(PROJECT_ROOT, "index.html"),
    os.path.join(PROJECT_ROOT, "trips.html"),
    os.path.join(PROJECT_ROOT, "trip-detail.html"),
    os.path.join(PROJECT_ROOT, "checkout.html"),
]

# Modern color scheme
COLORS = {
    'bg': '#1a1a2e',
    'sidebar': '#16213e',
    'card': '#0f3460',
    'accent': '#e94560',
    'accent_hover': '#ff6b6b',
    'text': '#ffffff',
    'text_secondary': '#a0a0a0',
    'success': '#00d26a',
    'warning': '#ffc107',
    'input_bg': '#0a1628',
    'border': '#2d4a6f'
}


class DatePicker(tk.Toplevel):
    """A beautiful calendar date picker widget."""
    
    def __init__(self, parent, callback):
        super().__init__(parent)
        self.callback = callback
        self.title("📅 Select Date Range")
        self.geometry("400x450")
        self.configure(bg=COLORS['bg'])
        self.transient(parent)
        self.grab_set()
        
        # Current displayed month/year
        self.current_date = datetime.now()
        self.selected_start = None
        self.selected_end = None
        
        self.create_widgets()
        self.display_calendar()
    
    def create_widgets(self):
        """Create calendar widgets."""
        # Header with month/year navigation
        header = tk.Frame(self, bg=COLORS['sidebar'])
        header.pack(fill=tk.X, pady=(0, 10))
        
        # Previous month button
        prev_btn = tk.Button(header, text="◀", font=('Helvetica', 14, 'bold'),
                           bg=COLORS['sidebar'], fg=COLORS['text'],
                           bd=0, cursor='hand2',
                           command=self.prev_month)
        prev_btn.pack(side=tk.LEFT, padx=20, pady=10)
        
        # Month/Year label
        self.month_label = tk.Label(header, text="",
                                   font=('Helvetica', 16, 'bold'),
                                   bg=COLORS['sidebar'], fg=COLORS['text'])
        self.month_label.pack(side=tk.LEFT, expand=True)
        
        # Next month button
        next_btn = tk.Button(header, text="▶", font=('Helvetica', 14, 'bold'),
                           bg=COLORS['sidebar'], fg=COLORS['text'],
                           bd=0, cursor='hand2',
                           command=self.next_month)
        next_btn.pack(side=tk.RIGHT, padx=20, pady=10)
        
        # Days header
        days_header = tk.Frame(self, bg=COLORS['bg'])
        days_header.pack(fill=tk.X, padx=20)
        
        days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        for day in days:
            tk.Label(days_header, text=day, font=('Helvetica', 10, 'bold'),
                    bg=COLORS['bg'], fg=COLORS['text_secondary'],
                    width=5).pack(side=tk.LEFT, expand=True)
        
        # Calendar grid
        self.calendar_frame = tk.Frame(self, bg=COLORS['bg'])
        self.calendar_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=10)
        
        # Selection info
        self.selection_label = tk.Label(self, text="Click to select start date, click again for end date",
                                        font=('Helvetica', 10),
                                        bg=COLORS['bg'], fg=COLORS['text_secondary'])
        self.selection_label.pack(pady=5)
        
        # Buttons
        btn_frame = tk.Frame(self, bg=COLORS['bg'])
        btn_frame.pack(pady=15)
        
        confirm_btn = tk.Button(btn_frame, text="✓ Add Selected Dates",
                               font=('Helvetica', 11, 'bold'),
                               bg=COLORS['success'], fg=COLORS['text'],
                               bd=0, padx=20, pady=8, cursor='hand2',
                               command=self.confirm_selection)
        confirm_btn.pack(side=tk.LEFT, padx=5)
        
        cancel_btn = tk.Button(btn_frame, text="Cancel",
                              font=('Helvetica', 11),
                              bg=COLORS['card'], fg=COLORS['text'],
                              bd=0, padx=20, pady=8, cursor='hand2',
                              command=self.destroy)
        cancel_btn.pack(side=tk.LEFT, padx=5)
    
    def display_calendar(self):
        """Display the calendar for current month."""
        # Clear existing
        for widget in self.calendar_frame.winfo_children():
            widget.destroy()
        
        # Update month label
        self.month_label.config(text=self.current_date.strftime('%B %Y'))
        
        # Get calendar for month
        cal = calendar.Calendar(firstweekday=0)
        month_days = cal.monthdayscalendar(self.current_date.year, self.current_date.month)
        
        for week in month_days:
            week_frame = tk.Frame(self.calendar_frame, bg=COLORS['bg'])
            week_frame.pack(fill=tk.X)
            
            for day in week:
                if day == 0:
                    # Empty cell
                    lbl = tk.Label(week_frame, text="", width=5, height=2,
                                  bg=COLORS['bg'])
                else:
                    date = datetime(self.current_date.year, self.current_date.month, day)
                    
                    # Determine background color
                    bg = COLORS['card']
                    if self.selected_start and self.selected_end:
                        if self.selected_start <= date <= self.selected_end:
                            bg = COLORS['accent']
                    elif self.selected_start and date == self.selected_start:
                        bg = COLORS['accent']
                    
                    lbl = tk.Label(week_frame, text=str(day), width=5, height=2,
                                  font=('Helvetica', 11),
                                  bg=bg, fg=COLORS['text'],
                                  cursor='hand2')
                    lbl.bind('<Button-1>', lambda e, d=date: self.select_date(d))
                    lbl.bind('<Enter>', lambda e, l=lbl: l.configure(bg=COLORS['accent_hover']) if l.cget('bg') != COLORS['accent'] else None)
                    lbl.bind('<Leave>', lambda e, l=lbl, d=date: self.reset_day_bg(l, d))
                
                lbl.pack(side=tk.LEFT, expand=True, padx=1, pady=1)
    
    def reset_day_bg(self, label, date):
        """Reset day background after hover."""
        if self.selected_start and self.selected_end:
            if self.selected_start <= date <= self.selected_end:
                label.configure(bg=COLORS['accent'])
                return
        elif self.selected_start and date == self.selected_start:
            label.configure(bg=COLORS['accent'])
            return
        label.configure(bg=COLORS['card'])
    
    def select_date(self, date):
        """Handle date selection."""
        if not self.selected_start or (self.selected_start and self.selected_end):
            # Start new selection
            self.selected_start = date
            self.selected_end = None
            self.selection_label.config(text=f"Start: {date.strftime('%b %d')} - Click end date")
        else:
            # Set end date
            if date < self.selected_start:
                self.selected_end = self.selected_start
                self.selected_start = date
            else:
                self.selected_end = date
            self.selection_label.config(text=f"Selected: {self.selected_start.strftime('%b %d')} - {self.selected_end.strftime('%b %d')}")
        
        self.display_calendar()
    
    def prev_month(self):
        """Go to previous month."""
        if self.current_date.month == 1:
            self.current_date = self.current_date.replace(year=self.current_date.year - 1, month=12)
        else:
            self.current_date = self.current_date.replace(month=self.current_date.month - 1)
        self.display_calendar()
    
    def next_month(self):
        """Go to next month."""
        if self.current_date.month == 12:
            self.current_date = self.current_date.replace(year=self.current_date.year + 1, month=1)
        else:
            self.current_date = self.current_date.replace(month=self.current_date.month + 1)
        self.display_calendar()
    
    def confirm_selection(self):
        """Confirm and return the selected date range."""
        if self.selected_start:
            if self.selected_end:
                # Format as "Jan 15-17" or "Jan 15 - Feb 2" if different months
                if self.selected_start.month == self.selected_end.month:
                    date_str = f"{self.selected_start.strftime('%b')} {self.selected_start.day}-{self.selected_end.day}"
                else:
                    date_str = f"{self.selected_start.strftime('%b %d')} - {self.selected_end.strftime('%b %d')}"
            else:
                date_str = self.selected_start.strftime('%b %d')
            
            self.callback(date_str)
        self.destroy()


class TripManagerApp:
    def __init__(self, root):
        self.root = root
        self.root.title("🏔️ Trip Manager - Team Weekend Trekkers")
        self.root.geometry("1200x800")
        self.root.configure(bg=COLORS['bg'])
        
        # Data
        self.trips = []
        self.current_trip_index = None
        self.unsaved_changes = False
        
        # Load trips
        self.load_trips()
        
        # Create UI
        self.create_styles()
        self.create_main_layout()
        
        # Bind close event
        self.root.protocol("WM_DELETE_WINDOW", self.on_close)
    
    def create_styles(self):
        """Configure ttk styles for modern look."""
        style = ttk.Style()
        style.theme_use('clam')
        
        # Configure styles
        style.configure('Sidebar.TFrame', background=COLORS['sidebar'])
        style.configure('Card.TFrame', background=COLORS['card'])
        style.configure('Main.TFrame', background=COLORS['bg'])
        
        style.configure('Title.TLabel', 
                       background=COLORS['sidebar'],
                       foreground=COLORS['text'],
                       font=('Helvetica', 18, 'bold'))
        
        style.configure('Heading.TLabel',
                       background=COLORS['card'],
                       foreground=COLORS['text'],
                       font=('Helvetica', 14, 'bold'))
        
        style.configure('Normal.TLabel',
                       background=COLORS['card'],
                       foreground=COLORS['text'],
                       font=('Helvetica', 11))
        
        style.configure('Secondary.TLabel',
                       background=COLORS['card'],
                       foreground=COLORS['text_secondary'],
                       font=('Helvetica', 10))
        
        style.configure('Accent.TButton',
                       background=COLORS['accent'],
                       foreground=COLORS['text'],
                       font=('Helvetica', 11, 'bold'),
                       padding=(20, 10))
        
        style.map('Accent.TButton',
                 background=[('active', COLORS['accent_hover'])])
        
        style.configure('Success.TButton',
                       background=COLORS['success'],
                       foreground=COLORS['text'],
                       font=('Helvetica', 11, 'bold'),
                       padding=(20, 10))
    
    def create_main_layout(self):
        """Create the main application layout."""
        # Main container
        main_container = ttk.Frame(self.root, style='Main.TFrame')
        main_container.pack(fill=tk.BOTH, expand=True)
        
        # Sidebar
        self.create_sidebar(main_container)
        
        # Content area
        self.content_frame = ttk.Frame(main_container, style='Main.TFrame')
        self.content_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=20, pady=20)
        
        # Show trip list by default
        self.show_trip_list()
    
    def create_sidebar(self, parent):
        """Create the sidebar with navigation."""
        sidebar = tk.Frame(parent, bg=COLORS['sidebar'], width=280)
        sidebar.pack(side=tk.LEFT, fill=tk.Y)
        sidebar.pack_propagate(False)
        
        # Logo/Title
        title_frame = tk.Frame(sidebar, bg=COLORS['sidebar'])
        title_frame.pack(fill=tk.X, pady=30, padx=20)
        
        tk.Label(title_frame, text="🏔️", font=('Helvetica', 36),
                bg=COLORS['sidebar'], fg=COLORS['text']).pack()
        tk.Label(title_frame, text="Trip Manager", font=('Helvetica', 20, 'bold'),
                bg=COLORS['sidebar'], fg=COLORS['text']).pack()
        tk.Label(title_frame, text="Team Weekend Trekkers", font=('Helvetica', 10),
                bg=COLORS['sidebar'], fg=COLORS['text_secondary']).pack()
        
        # Navigation buttons
        nav_frame = tk.Frame(sidebar, bg=COLORS['sidebar'])
        nav_frame.pack(fill=tk.X, pady=20)
        
        nav_buttons = [
            ("📋 All Trips", self.show_trip_list),
            ("➕ Add New Trip", self.show_add_trip),
            ("⭐ Featured Trips", self.show_featured_trips),
            ("🖼️ Photo Manager", self.show_photo_manager),
            ("💾 Save Changes", self.save_trips),
            ("🚀 Deploy to GitHub", self.deploy_to_github),
        ]
        
        for text, command in nav_buttons:
            btn = tk.Button(nav_frame, text=text, font=('Helvetica', 12),
                          bg=COLORS['sidebar'], fg=COLORS['text'],
                          activebackground=COLORS['card'],
                          activeforeground=COLORS['text'],
                          bd=0, pady=15, padx=20,
                          anchor='w', cursor='hand2',
                          command=command)
            btn.pack(fill=tk.X)
            btn.bind('<Enter>', lambda e, b=btn: b.configure(bg=COLORS['card']))
            btn.bind('<Leave>', lambda e, b=btn: b.configure(bg=COLORS['sidebar']))
        
        # Status bar at bottom
        status_frame = tk.Frame(sidebar, bg=COLORS['sidebar'])
        status_frame.pack(side=tk.BOTTOM, fill=tk.X, pady=20, padx=20)
        
        self.status_label = tk.Label(status_frame, 
                                     text=f"✅ {len(self.trips)} trips loaded",
                                     font=('Helvetica', 10),
                                     bg=COLORS['sidebar'], 
                                     fg=COLORS['success'])
        self.status_label.pack()
    
    def clear_content(self):
        """Clear the content area."""
        for widget in self.content_frame.winfo_children():
            widget.destroy()
    
    def show_trip_list(self):
        """Show list of all trips."""
        self.clear_content()
        
        # Initialize trips_frame to None first
        self.trips_frame = None
        
        # Header
        header = tk.Frame(self.content_frame, bg=COLORS['bg'])
        header.pack(fill=tk.X, pady=(0, 20))
        
        tk.Label(header, text="📋 All Trips", font=('Helvetica', 24, 'bold'),
                bg=COLORS['bg'], fg=COLORS['text']).pack(side=tk.LEFT)
        
        # Search box
        search_frame = tk.Frame(header, bg=COLORS['bg'])
        search_frame.pack(side=tk.RIGHT)
        
        self.search_var = tk.StringVar()
        search_entry = tk.Entry(search_frame, textvariable=self.search_var,
                               font=('Helvetica', 12), width=25,
                               bg=COLORS['input_bg'], fg=COLORS['text'],
                               insertbackground=COLORS['text'],
                               bd=0, relief='flat')
        search_entry.pack(side=tk.LEFT, ipady=8, ipadx=10)
        search_entry.insert(0, "🔍 Search trips...")
        search_entry.bind('<FocusIn>', lambda e: search_entry.delete(0, tk.END) if search_entry.get() == "🔍 Search trips..." else None)
        search_entry.bind('<FocusOut>', lambda e: search_entry.insert(0, "🔍 Search trips...") if not search_entry.get() else None)
        
        # Trips container with scrollbar
        container = tk.Frame(self.content_frame, bg=COLORS['bg'])
        container.pack(fill=tk.BOTH, expand=True)
        
        canvas = tk.Canvas(container, bg=COLORS['bg'], highlightthickness=0)
        scrollbar = ttk.Scrollbar(container, orient="vertical", command=canvas.yview)
        self.trips_frame = tk.Frame(canvas, bg=COLORS['bg'])
        
        self.trips_frame.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.create_window((0, 0), window=self.trips_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        # Mouse wheel scrolling
        canvas.bind_all("<MouseWheel>", lambda e: canvas.yview_scroll(int(-1*(e.delta/120)), "units"))
        
        # Display trips first, then add trace
        self.display_trips()
        
        # Add search trace AFTER trips_frame is created
        self.search_var.trace('w', self.filter_trips)
    
    def display_trips(self, filter_text=""):
        """Display trip cards."""
        # Safety check
        if not hasattr(self, 'trips_frame') or self.trips_frame is None:
            return
        
        try:
            # Clear existing
            for widget in self.trips_frame.winfo_children():
                widget.destroy()
        except tk.TclError:
            return
        
        for idx, trip in enumerate(self.trips):
            # Filter check
            if filter_text and filter_text.lower() not in trip.get('title', '').lower():
                continue
            
            # Trip card
            card = tk.Frame(self.trips_frame, bg=COLORS['card'], pady=15, padx=20)
            card.pack(fill=tk.X, pady=5, padx=5)
            
            # Trip info
            info_frame = tk.Frame(card, bg=COLORS['card'])
            info_frame.pack(side=tk.LEFT, fill=tk.X, expand=True)
            
            tk.Label(info_frame, text=trip.get('title', 'Unknown'),
                    font=('Helvetica', 14, 'bold'),
                    bg=COLORS['card'], fg=COLORS['text']).pack(anchor='w')
            
            details = f"📍 {trip.get('location', 'N/A')} | 💰 ₹{trip.get('price', 0)} | 🏷️ {trip.get('badge', 'N/A')}"
            tk.Label(info_frame, text=details,
                    font=('Helvetica', 10),
                    bg=COLORS['card'], fg=COLORS['text_secondary']).pack(anchor='w')
            
            dates_count = len(trip.get('availableDates', []))
            tk.Label(info_frame, text=f"📅 {dates_count} available dates",
                    font=('Helvetica', 10),
                    bg=COLORS['card'], fg=COLORS['text_secondary']).pack(anchor='w')
            
            # Action buttons
            btn_frame = tk.Frame(card, bg=COLORS['card'])
            btn_frame.pack(side=tk.RIGHT)
            
            edit_btn = tk.Button(btn_frame, text="✏️ Edit", 
                               font=('Helvetica', 10),
                               bg=COLORS['accent'], fg=COLORS['text'],
                               bd=0, padx=15, pady=5, cursor='hand2',
                               command=lambda i=idx: self.show_edit_trip(i))
            edit_btn.pack(side=tk.LEFT, padx=5)
            
            del_btn = tk.Button(btn_frame, text="🗑️", 
                              font=('Helvetica', 10),
                              bg='#dc3545', fg=COLORS['text'],
                              bd=0, padx=10, pady=5, cursor='hand2',
                              command=lambda i=idx: self.delete_trip(i))
            del_btn.pack(side=tk.LEFT)
    
    def filter_trips(self, *args):
        """Filter trips based on search."""
        # Safety check
        if not hasattr(self, 'trips_frame') or self.trips_frame is None:
            return
        filter_text = self.search_var.get()
        if filter_text == "🔍 Search trips...":
            filter_text = ""
        self.display_trips(filter_text)
    
    def show_edit_trip(self, index):
        """Show edit form for a trip."""
        self.current_trip_index = index
        trip = self.trips[index]
        self.clear_content()
        
        # Header
        header = tk.Frame(self.content_frame, bg=COLORS['bg'])
        header.pack(fill=tk.X, pady=(0, 20))
        
        back_btn = tk.Button(header, text="← Back", font=('Helvetica', 11),
                           bg=COLORS['card'], fg=COLORS['text'],
                           bd=0, padx=15, pady=5, cursor='hand2',
                           command=self.show_trip_list)
        back_btn.pack(side=tk.LEFT)
        
        tk.Label(header, text=f"✏️ Edit: {trip.get('title', '')}", 
                font=('Helvetica', 20, 'bold'),
                bg=COLORS['bg'], fg=COLORS['text']).pack(side=tk.LEFT, padx=20)
        
        # Scrollable form
        container = tk.Frame(self.content_frame, bg=COLORS['bg'])
        container.pack(fill=tk.BOTH, expand=True)
        
        canvas = tk.Canvas(container, bg=COLORS['bg'], highlightthickness=0)
        scrollbar = ttk.Scrollbar(container, orient="vertical", command=canvas.yview)
        form_frame = tk.Frame(canvas, bg=COLORS['bg'])
        
        form_frame.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.create_window((0, 0), window=form_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        # Form fields
        self.edit_vars = {}
        
        fields = [
            ('title', 'Trip Title', trip.get('title', '')),
            ('location', 'Location', trip.get('location', '')),
            ('badge', 'Badge (e.g., "Weekend Trip")', trip.get('badge', '')),
            ('price', 'Price (₹)', str(trip.get('price', ''))),
            ('duration', 'Duration', trip.get('duration', '')),
            ('difficulty', 'Difficulty', trip.get('difficulty', '')),
            ('groupSize', 'Group Size', trip.get('groupSize', '')),
            ('image', 'Image Path', trip.get('image', '')),
        ]
        
        for field_id, label, value in fields:
            self.create_form_field(form_frame, field_id, label, value)
        
        # Description/About (multiline)
        desc_frame = tk.Frame(form_frame, bg=COLORS['card'])
        desc_frame.pack(fill=tk.X, pady=10, padx=5)
        
        tk.Label(desc_frame, text="About / Description", font=('Helvetica', 11, 'bold'),
                bg=COLORS['card'], fg=COLORS['text']).pack(anchor='w', padx=15, pady=(15, 5))
        
        self.desc_text = tk.Text(desc_frame, height=4, font=('Helvetica', 11),
                                bg=COLORS['input_bg'], fg=COLORS['text'],
                                insertbackground=COLORS['text'],
                                bd=0, relief='flat', wrap=tk.WORD)
        self.desc_text.pack(fill=tk.X, padx=15, pady=(0, 15), ipady=5)
        self.desc_text.insert('1.0', trip.get('about', trip.get('description', '')))
        
        # Available Dates section
        dates_frame = tk.Frame(form_frame, bg=COLORS['card'])
        dates_frame.pack(fill=tk.X, pady=10, padx=5)
        
        tk.Label(dates_frame, text="📅 Available Dates", font=('Helvetica', 12, 'bold'),
                bg=COLORS['card'], fg=COLORS['text']).pack(anchor='w', padx=15, pady=(15, 10))
        
        # Dates list
        dates_list_frame = tk.Frame(dates_frame, bg=COLORS['card'])
        dates_list_frame.pack(fill=tk.X, padx=15)
        
        self.dates_listbox = tk.Listbox(dates_list_frame, height=5,
                                        font=('Helvetica', 11),
                                        bg=COLORS['input_bg'], fg=COLORS['text'],
                                        selectbackground=COLORS['accent'],
                                        bd=0, relief='flat')
        self.dates_listbox.pack(side=tk.LEFT, fill=tk.X, expand=True)
        
        for date in trip.get('availableDates', []):
            self.dates_listbox.insert(tk.END, date)
        
        # Date buttons
        date_btn_frame = tk.Frame(dates_list_frame, bg=COLORS['card'])
        date_btn_frame.pack(side=tk.RIGHT, padx=(10, 0))
        
        add_date_btn = tk.Button(date_btn_frame, text="➕ Add",
                                font=('Helvetica', 10),
                                bg=COLORS['success'], fg=COLORS['text'],
                                bd=0, padx=10, pady=5, cursor='hand2',
                                command=self.add_date)
        add_date_btn.pack(pady=2)
        
        remove_date_btn = tk.Button(date_btn_frame, text="➖ Remove",
                                   font=('Helvetica', 10),
                                   bg='#dc3545', fg=COLORS['text'],
                                   bd=0, padx=10, pady=5, cursor='hand2',
                                   command=self.remove_date)
        remove_date_btn.pack(pady=2)
        
        # Calendar picker button
        calendar_btn = tk.Button(date_btn_frame, text="📅 Pick",
                                font=('Helvetica', 10),
                                bg=COLORS['accent'], fg=COLORS['text'],
                                bd=0, padx=10, pady=5, cursor='hand2',
                                command=self.open_date_picker)
        calendar_btn.pack(pady=2)
        
        # New date entry
        new_date_frame = tk.Frame(dates_frame, bg=COLORS['card'])
        new_date_frame.pack(fill=tk.X, padx=15, pady=(10, 15))
        
        tk.Label(new_date_frame, text="Or type manually (format: 'Jan 15-17'):",
                font=('Helvetica', 10),
                bg=COLORS['card'], fg=COLORS['text_secondary']).pack(anchor='w')
        
        self.new_date_entry = tk.Entry(new_date_frame, font=('Helvetica', 11),
                                       bg=COLORS['input_bg'], fg=COLORS['text'],
                                       insertbackground=COLORS['text'],
                                       bd=0, relief='flat')
        self.new_date_entry.pack(fill=tk.X, ipady=8)
        
        # Highlights section
        highlights_frame = tk.Frame(form_frame, bg=COLORS['card'])
        highlights_frame.pack(fill=tk.X, pady=10, padx=5)
        
        tk.Label(highlights_frame, text="✨ Highlights (one per line)", 
                font=('Helvetica', 12, 'bold'),
                bg=COLORS['card'], fg=COLORS['text']).pack(anchor='w', padx=15, pady=(15, 5))
        
        self.highlights_text = tk.Text(highlights_frame, height=4, font=('Helvetica', 11),
                                       bg=COLORS['input_bg'], fg=COLORS['text'],
                                       insertbackground=COLORS['text'],
                                       bd=0, relief='flat', wrap=tk.WORD)
        self.highlights_text.pack(fill=tk.X, padx=15, pady=(0, 15), ipady=5)
        highlights = trip.get('highlights', [])
        self.highlights_text.insert('1.0', '\n'.join(highlights) if highlights else '')
        
        # Day-wise Itinerary section
        itinerary_frame = tk.Frame(form_frame, bg=COLORS['card'])
        itinerary_frame.pack(fill=tk.X, pady=10, padx=5)
        
        tk.Label(itinerary_frame, text="📅 Day-wise Itinerary", 
                font=('Helvetica', 12, 'bold'),
                bg=COLORS['card'], fg=COLORS['text']).pack(anchor='w', padx=15, pady=(15, 5))
        
        tk.Label(itinerary_frame, text="Click on a day to edit its activities", 
                font=('Helvetica', 10),
                bg=COLORS['card'], fg=COLORS['text_secondary']).pack(anchor='w', padx=15, pady=(0, 10))
        
        # Days list container
        self.itinerary_days_frame = tk.Frame(itinerary_frame, bg=COLORS['card'])
        self.itinerary_days_frame.pack(fill=tk.X, padx=15, pady=(0, 10))
        
        # Store itinerary data
        self.current_itinerary = trip.get('itinerary', [])
        
        # Display existing days
        self.display_itinerary_days()
        
        # Buttons for itinerary management
        itinerary_btn_frame = tk.Frame(itinerary_frame, bg=COLORS['card'])
        itinerary_btn_frame.pack(fill=tk.X, padx=15, pady=(0, 15))
        
        add_day_btn = tk.Button(itinerary_btn_frame, text="➕ Add Day",
                               font=('Helvetica', 10),
                               bg=COLORS['success'], fg=COLORS['text'],
                               bd=0, padx=15, pady=5, cursor='hand2',
                               command=self.add_itinerary_day)
        add_day_btn.pack(side=tk.LEFT, padx=5)
        
        # Save button
        save_frame = tk.Frame(form_frame, bg=COLORS['bg'])
        save_frame.pack(fill=tk.X, pady=20, padx=5)
        
        save_btn = tk.Button(save_frame, text="💾 Save Trip Changes",
                           font=('Helvetica', 12, 'bold'),
                           bg=COLORS['success'], fg=COLORS['text'],
                           bd=0, padx=30, pady=12, cursor='hand2',
                           command=self.save_trip_edit)
        save_btn.pack()
    
    def create_form_field(self, parent, field_id, label, value):
        """Create a form field."""
        frame = tk.Frame(parent, bg=COLORS['card'])
        frame.pack(fill=tk.X, pady=5, padx=5)
        
        tk.Label(frame, text=label, font=('Helvetica', 11, 'bold'),
                bg=COLORS['card'], fg=COLORS['text']).pack(anchor='w', padx=15, pady=(15, 5))
        
        var = tk.StringVar(value=value)
        entry = tk.Entry(frame, textvariable=var, font=('Helvetica', 11),
                        bg=COLORS['input_bg'], fg=COLORS['text'],
                        insertbackground=COLORS['text'],
                        bd=0, relief='flat')
        entry.pack(fill=tk.X, padx=15, pady=(0, 15), ipady=8)
        
        self.edit_vars[field_id] = var
    
    def open_date_picker(self):
        """Open the calendar date picker."""
        DatePicker(self.root, self.add_date_from_picker)
    
    def add_date_from_picker(self, date_str):
        """Add date from calendar picker."""
        if date_str:
            self.dates_listbox.insert(tk.END, date_str)
            self.unsaved_changes = True
            self.update_status(f"📅 Added date: {date_str}")
    
    def add_date(self):
        """Add a new date to the list."""
        new_date = self.new_date_entry.get().strip()
        if new_date:
            self.dates_listbox.insert(tk.END, new_date)
            self.new_date_entry.delete(0, tk.END)
            self.unsaved_changes = True
    
    def remove_date(self):
        """Remove selected date from list."""
        selection = self.dates_listbox.curselection()
        if selection:
            self.dates_listbox.delete(selection[0])
            self.unsaved_changes = True
    
    def display_itinerary_days(self):
        """Display all itinerary days with edit/delete buttons."""
        # Clear existing
        for widget in self.itinerary_days_frame.winfo_children():
            widget.destroy()
        
        if not self.current_itinerary:
            tk.Label(self.itinerary_days_frame, text="No itinerary days added yet",
                    font=('Helvetica', 10, 'italic'),
                    bg=COLORS['card'], fg=COLORS['text_secondary']).pack(anchor='w')
            return
        
        for idx, day_data in enumerate(self.current_itinerary):
            day_row = tk.Frame(self.itinerary_days_frame, bg=COLORS['input_bg'])
            day_row.pack(fill=tk.X, pady=3)
            
            # Day info
            day_text = f"{day_data.get('day', 'Day ?')}: {day_data.get('title', 'Untitled')}"
            activities_count = len(day_data.get('activities', []))
            
            info_frame = tk.Frame(day_row, bg=COLORS['input_bg'])
            info_frame.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=10, pady=8)
            
            tk.Label(info_frame, text=day_text,
                    font=('Helvetica', 11, 'bold'),
                    bg=COLORS['input_bg'], fg=COLORS['text']).pack(anchor='w')
            
            tk.Label(info_frame, text=f"📋 {activities_count} activities",
                    font=('Helvetica', 9),
                    bg=COLORS['input_bg'], fg=COLORS['text_secondary']).pack(anchor='w')
            
            # Edit/Delete buttons
            btn_frame = tk.Frame(day_row, bg=COLORS['input_bg'])
            btn_frame.pack(side=tk.RIGHT, padx=5, pady=5)
            
            edit_btn = tk.Button(btn_frame, text="✏️ Edit",
                               font=('Helvetica', 9),
                               bg=COLORS['accent'], fg=COLORS['text'],
                               bd=0, padx=10, pady=3, cursor='hand2',
                               command=lambda i=idx: self.edit_itinerary_day(i))
            edit_btn.pack(side=tk.LEFT, padx=2)
            
            del_btn = tk.Button(btn_frame, text="🗑️",
                              font=('Helvetica', 9),
                              bg='#dc3545', fg=COLORS['text'],
                              bd=0, padx=8, pady=3, cursor='hand2',
                              command=lambda i=idx: self.delete_itinerary_day(i))
            del_btn.pack(side=tk.LEFT, padx=2)
    
    def add_itinerary_day(self):
        """Add a new itinerary day."""
        # Determine next day number
        if self.current_itinerary:
            # Try to find the highest day number
            max_day = -1
            for day_data in self.current_itinerary:
                day_str = day_data.get('day', '')
                try:
                    day_num = int(day_str.replace('Day ', '').strip())
                    max_day = max(max_day, day_num)
                except:
                    pass
            next_day = max_day + 1
        else:
            next_day = 0
        
        new_day = {
            'day': f'Day {next_day}',
            'title': 'New Day Title',
            'activities': ['Add activity here']
        }
        self.current_itinerary.append(new_day)
        self.display_itinerary_days()
        self.unsaved_changes = True
        self.update_status(f"📅 Added Day {next_day} to itinerary")
        
        # Open editor for the new day
        self.edit_itinerary_day(len(self.current_itinerary) - 1)
    
    def delete_itinerary_day(self, index):
        """Delete an itinerary day."""
        if messagebox.askyesno("Confirm Delete", 
                              f"Delete {self.current_itinerary[index].get('day', 'this day')}?"):
            del self.current_itinerary[index]
            self.display_itinerary_days()
            self.unsaved_changes = True
            self.update_status("🗑️ Itinerary day deleted")
    
    def edit_itinerary_day(self, index):
        """Open editor popup for a specific itinerary day."""
        day_data = self.current_itinerary[index]
        
        # Create popup window
        editor = tk.Toplevel(self.root)
        editor.title(f"✏️ Edit {day_data.get('day', 'Day')}")
        editor.geometry("600x650")
        editor.configure(bg=COLORS['bg'])
        editor.transient(self.root)
        editor.grab_set()
        
        # Header
        header = tk.Frame(editor, bg=COLORS['sidebar'])
        header.pack(fill=tk.X)
        
        tk.Label(header, text=f"✏️ Edit {day_data.get('day', 'Day')}",
                font=('Helvetica', 16, 'bold'),
                bg=COLORS['sidebar'], fg=COLORS['text']).pack(pady=15)
        
        # Form content - use a canvas for scrolling if needed
        form = tk.Frame(editor, bg=COLORS['bg'])
        form.pack(fill=tk.BOTH, expand=True, padx=20, pady=10)
        
        # Day label (e.g., "Day 0", "Day 1")
        day_frame = tk.Frame(form, bg=COLORS['card'])
        day_frame.pack(fill=tk.X, pady=5)
        
        tk.Label(day_frame, text="Day Label (e.g., 'Day 0', 'Day 1')",
                font=('Helvetica', 11, 'bold'),
                bg=COLORS['card'], fg=COLORS['text']).pack(anchor='w', padx=15, pady=(15, 5))
        
        day_var = tk.StringVar(value=day_data.get('day', ''))
        day_entry = tk.Entry(day_frame, textvariable=day_var, font=('Helvetica', 11),
                           bg=COLORS['input_bg'], fg=COLORS['text'],
                           insertbackground=COLORS['text'],
                           bd=0, relief='flat')
        day_entry.pack(fill=tk.X, padx=15, pady=(0, 15), ipady=8)
        
        # Title
        title_frame = tk.Frame(form, bg=COLORS['card'])
        title_frame.pack(fill=tk.X, pady=5)
        
        tk.Label(title_frame, text="Day Title (e.g., 'Night Departure from Bangalore')",
                font=('Helvetica', 11, 'bold'),
                bg=COLORS['card'], fg=COLORS['text']).pack(anchor='w', padx=15, pady=(15, 5))
        
        title_var = tk.StringVar(value=day_data.get('title', ''))
        title_entry = tk.Entry(title_frame, textvariable=title_var, font=('Helvetica', 11),
                              bg=COLORS['input_bg'], fg=COLORS['text'],
                              insertbackground=COLORS['text'],
                              bd=0, relief='flat')
        title_entry.pack(fill=tk.X, padx=15, pady=(0, 15), ipady=8)
        
        # Activities
        activities_frame = tk.Frame(form, bg=COLORS['card'])
        activities_frame.pack(fill=tk.BOTH, expand=True, pady=5)
        
        tk.Label(activities_frame, text="Activities (one per line, e.g., '10:00 AM - Pickup from Bangalore')",
                font=('Helvetica', 11, 'bold'),
                bg=COLORS['card'], fg=COLORS['text']).pack(anchor='w', padx=15, pady=(15, 5))
        
        activities_text = tk.Text(activities_frame, height=10, font=('Helvetica', 11),
                                 bg=COLORS['input_bg'], fg=COLORS['text'],
                                 insertbackground=COLORS['text'],
                                 bd=0, relief='flat', wrap=tk.WORD)
        activities_text.pack(fill=tk.BOTH, expand=True, padx=15, pady=(0, 15), ipady=5)
        
        # Insert existing activities
        activities = day_data.get('activities', [])
        activities_text.insert('1.0', '\n'.join(activities) if activities else '')
        
        # Buttons - fixed at bottom with visible background
        btn_frame = tk.Frame(editor, bg=COLORS['sidebar'])
        btn_frame.pack(fill=tk.X, side=tk.BOTTOM, pady=0)
        
        btn_inner = tk.Frame(btn_frame, bg=COLORS['sidebar'])
        btn_inner.pack(pady=15)
        
        def save_day_changes():
            """Save the day changes."""
            self.current_itinerary[index] = {
                'day': day_var.get().strip(),
                'title': title_var.get().strip(),
                'activities': [a.strip() for a in activities_text.get('1.0', tk.END).strip().split('\n') if a.strip()]
            }
            self.display_itinerary_days()
            self.unsaved_changes = True
            self.update_status(f"✏️ Updated {day_var.get()}")
            editor.destroy()
        
        save_btn = tk.Button(btn_inner, text="💾 Save Day",
                           font=('Helvetica', 12, 'bold'),
                           bg=COLORS['success'], fg=COLORS['text'],
                           bd=0, padx=30, pady=12, cursor='hand2',
                           command=save_day_changes)
        save_btn.pack(side=tk.LEFT, padx=10)
        
        cancel_btn = tk.Button(btn_inner, text="Cancel",
                              font=('Helvetica', 12),
                              bg=COLORS['card'], fg=COLORS['text'],
                              bd=0, padx=30, pady=12, cursor='hand2',
                              command=editor.destroy)
        cancel_btn.pack(side=tk.LEFT, padx=10)

    def save_trip_edit(self):
        """Save edits to current trip."""
        if self.current_trip_index is None:
            return
        
        trip = self.trips[self.current_trip_index]
        
        # Update fields - keep all values as strings (price includes ₹ symbol)
        for field_id, var in self.edit_vars.items():
            value = var.get()
            trip[field_id] = value
        
        # Update about/description field
        trip['about'] = self.desc_text.get('1.0', tk.END).strip()
        
        # Update dates
        trip['availableDates'] = list(self.dates_listbox.get(0, tk.END))
        
        # Update highlights
        highlights_text = self.highlights_text.get('1.0', tk.END).strip()
        trip['highlights'] = [h.strip() for h in highlights_text.split('\n') if h.strip()]
        
        # Update itinerary
        if hasattr(self, 'current_itinerary'):
            trip['itinerary'] = self.current_itinerary
        
        self.unsaved_changes = True
        self.update_status("✏️ Trip updated - Don't forget to save!")
        messagebox.showinfo("Success", "Trip updated! Click 'Save Changes' to write to file.")
    
    def show_add_trip(self):
        """Show form to add new trip - matches Edit Trip form with all fields."""
        self.current_trip_index = None
        self.clear_content()
        
        # Initialize for new trip
        self.current_itinerary = []
        self.edit_vars = {}  # Reuse edit_vars for consistency with create_form_field
        
        # Header with back button
        header = tk.Frame(self.content_frame, bg=COLORS['bg'])
        header.pack(fill=tk.X, pady=(0, 20))
        
        back_btn = tk.Button(header, text="← Back", font=('Helvetica', 11),
                           bg=COLORS['card'], fg=COLORS['text'],
                           bd=0, padx=15, pady=5, cursor='hand2',
                           command=self.show_trip_list)
        back_btn.pack(side=tk.LEFT)
        
        tk.Label(header, text="➕ Add New Trip", 
                font=('Helvetica', 20, 'bold'),
                bg=COLORS['bg'], fg=COLORS['text']).pack(side=tk.LEFT, padx=20)
        
        # Scrollable form
        container = tk.Frame(self.content_frame, bg=COLORS['bg'])
        container.pack(fill=tk.BOTH, expand=True)
        
        canvas = tk.Canvas(container, bg=COLORS['bg'], highlightthickness=0)
        scrollbar = ttk.Scrollbar(container, orient="vertical", command=canvas.yview)
        form_frame = tk.Frame(canvas, bg=COLORS['bg'])
        
        form_frame.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.create_window((0, 0), window=form_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        # Mouse wheel scrolling
        canvas.bind_all("<MouseWheel>", lambda e: canvas.yview_scroll(int(-1*(e.delta/120)), "units"))
        
        # Form fields - same as Edit Trip but with ID field added at top
        fields = [
            ('id', 'Trip ID (e.g., "coorg-trek") - used in URL', ''),
            ('title', 'Trip Title', ''),
            ('location', 'Location', ''),
            ('badge', 'Badge (e.g., "Weekend Trip")', 'Weekend Trip'),
            ('price', 'Price (₹)', '2999'),
            ('duration', 'Duration', '2 Days / 1 Night'),
            ('difficulty', 'Difficulty', 'Moderate'),
            ('groupSize', 'Group Size', '15-20 people'),
            ('image', 'Image Path', 'images/trips/'),
        ]
        
        for field_id, label, default in fields:
            self.create_form_field(form_frame, field_id, label, default)
        
        # Description/About (multiline) - same as Edit Trip
        desc_frame = tk.Frame(form_frame, bg=COLORS['card'])
        desc_frame.pack(fill=tk.X, pady=10, padx=5)
        
        tk.Label(desc_frame, text="About / Description", font=('Helvetica', 11, 'bold'),
                bg=COLORS['card'], fg=COLORS['text']).pack(anchor='w', padx=15, pady=(15, 5))
        
        self.desc_text = tk.Text(desc_frame, height=4, font=('Helvetica', 11),
                                bg=COLORS['input_bg'], fg=COLORS['text'],
                                insertbackground=COLORS['text'],
                                bd=0, relief='flat', wrap=tk.WORD)
        self.desc_text.pack(fill=tk.X, padx=15, pady=(0, 15), ipady=5)
        
        # Available Dates section - same as Edit Trip
        dates_frame = tk.Frame(form_frame, bg=COLORS['card'])
        dates_frame.pack(fill=tk.X, pady=10, padx=5)
        
        tk.Label(dates_frame, text="📅 Available Dates", font=('Helvetica', 12, 'bold'),
                bg=COLORS['card'], fg=COLORS['text']).pack(anchor='w', padx=15, pady=(15, 10))
        
        # Dates list
        dates_list_frame = tk.Frame(dates_frame, bg=COLORS['card'])
        dates_list_frame.pack(fill=tk.X, padx=15)
        
        self.dates_listbox = tk.Listbox(dates_list_frame, height=5,
                                        font=('Helvetica', 11),
                                        bg=COLORS['input_bg'], fg=COLORS['text'],
                                        selectbackground=COLORS['accent'],
                                        bd=0, relief='flat')
        self.dates_listbox.pack(side=tk.LEFT, fill=tk.X, expand=True)
        
        # Date buttons
        date_btn_frame = tk.Frame(dates_list_frame, bg=COLORS['card'])
        date_btn_frame.pack(side=tk.RIGHT, padx=(10, 0))
        
        add_date_btn = tk.Button(date_btn_frame, text="➕ Add",
                                font=('Helvetica', 10),
                                bg=COLORS['success'], fg=COLORS['text'],
                                bd=0, padx=10, pady=5, cursor='hand2',
                                command=self.add_date)
        add_date_btn.pack(pady=2)
        
        remove_date_btn = tk.Button(date_btn_frame, text="➖ Remove",
                                   font=('Helvetica', 10),
                                   bg='#dc3545', fg=COLORS['text'],
                                   bd=0, padx=10, pady=5, cursor='hand2',
                                   command=self.remove_date)
        remove_date_btn.pack(pady=2)
        
        # Calendar picker button
        calendar_btn = tk.Button(date_btn_frame, text="📅 Pick",
                                font=('Helvetica', 10),
                                bg=COLORS['accent'], fg=COLORS['text'],
                                bd=0, padx=10, pady=5, cursor='hand2',
                                command=self.open_date_picker)
        calendar_btn.pack(pady=2)
        
        # New date entry
        new_date_frame = tk.Frame(dates_frame, bg=COLORS['card'])
        new_date_frame.pack(fill=tk.X, padx=15, pady=(10, 15))
        
        tk.Label(new_date_frame, text="Or type manually (format: 'Jan 15-17'):",
                font=('Helvetica', 10),
                bg=COLORS['card'], fg=COLORS['text_secondary']).pack(anchor='w')
        
        self.new_date_entry = tk.Entry(new_date_frame, font=('Helvetica', 11),
                                       bg=COLORS['input_bg'], fg=COLORS['text'],
                                       insertbackground=COLORS['text'],
                                       bd=0, relief='flat')
        self.new_date_entry.pack(fill=tk.X, ipady=8)
        
        # Highlights section - same as Edit Trip
        highlights_frame = tk.Frame(form_frame, bg=COLORS['card'])
        highlights_frame.pack(fill=tk.X, pady=10, padx=5)
        
        tk.Label(highlights_frame, text="✨ Highlights (one per line)", 
                font=('Helvetica', 12, 'bold'),
                bg=COLORS['card'], fg=COLORS['text']).pack(anchor='w', padx=15, pady=(15, 5))
        
        self.highlights_text = tk.Text(highlights_frame, height=4, font=('Helvetica', 11),
                                       bg=COLORS['input_bg'], fg=COLORS['text'],
                                       insertbackground=COLORS['text'],
                                       bd=0, relief='flat', wrap=tk.WORD)
        self.highlights_text.pack(fill=tk.X, padx=15, pady=(0, 15), ipady=5)
        
        # Day-wise Itinerary section - same as Edit Trip
        itinerary_frame = tk.Frame(form_frame, bg=COLORS['card'])
        itinerary_frame.pack(fill=tk.X, pady=10, padx=5)
        
        tk.Label(itinerary_frame, text="📅 Day-wise Itinerary", 
                font=('Helvetica', 12, 'bold'),
                bg=COLORS['card'], fg=COLORS['text']).pack(anchor='w', padx=15, pady=(15, 5))
        
        tk.Label(itinerary_frame, text="Click on a day to edit its activities", 
                font=('Helvetica', 10),
                bg=COLORS['card'], fg=COLORS['text_secondary']).pack(anchor='w', padx=15, pady=(0, 10))
        
        # Days list container
        self.itinerary_days_frame = tk.Frame(itinerary_frame, bg=COLORS['card'])
        self.itinerary_days_frame.pack(fill=tk.X, padx=15, pady=(0, 10))
        
        # Display existing days (empty for new trip)
        self.display_itinerary_days()
        
        # Buttons for itinerary management
        itinerary_btn_frame = tk.Frame(itinerary_frame, bg=COLORS['card'])
        itinerary_btn_frame.pack(fill=tk.X, padx=15, pady=(0, 15))
        
        add_day_btn = tk.Button(itinerary_btn_frame, text="➕ Add Day",
                               font=('Helvetica', 10),
                               bg=COLORS['success'], fg=COLORS['text'],
                               bd=0, padx=15, pady=5, cursor='hand2',
                               command=self.add_itinerary_day)
        add_day_btn.pack(side=tk.LEFT, padx=5)
        
        # Inclusions section
        inclusions_frame = tk.Frame(form_frame, bg=COLORS['card'])
        inclusions_frame.pack(fill=tk.X, pady=10, padx=5)
        
        tk.Label(inclusions_frame, text="✅ Inclusions (one per line)", 
                font=('Helvetica', 12, 'bold'),
                bg=COLORS['card'], fg=COLORS['text']).pack(anchor='w', padx=15, pady=(15, 5))
        
        self.inclusions_text = tk.Text(inclusions_frame, height=3, font=('Helvetica', 11),
                                       bg=COLORS['input_bg'], fg=COLORS['text'],
                                       insertbackground=COLORS['text'],
                                       bd=0, relief='flat', wrap=tk.WORD)
        self.inclusions_text.pack(fill=tk.X, padx=15, pady=(0, 15), ipady=5)
        self.inclusions_text.insert('1.0', 'Transportation\nAccommodation\nMeals\nGuide')
        
        # Exclusions section
        exclusions_frame = tk.Frame(form_frame, bg=COLORS['card'])
        exclusions_frame.pack(fill=tk.X, pady=10, padx=5)
        
        tk.Label(exclusions_frame, text="❌ Exclusions (one per line)", 
                font=('Helvetica', 12, 'bold'),
                bg=COLORS['card'], fg=COLORS['text']).pack(anchor='w', padx=15, pady=(15, 5))
        
        self.exclusions_text = tk.Text(exclusions_frame, height=3, font=('Helvetica', 11),
                                       bg=COLORS['input_bg'], fg=COLORS['text'],
                                       insertbackground=COLORS['text'],
                                       bd=0, relief='flat', wrap=tk.WORD)
        self.exclusions_text.pack(fill=tk.X, padx=15, pady=(0, 15), ipady=5)
        self.exclusions_text.insert('1.0', 'Personal expenses\nTravel insurance')
        
        # Add Trip button
        save_frame = tk.Frame(form_frame, bg=COLORS['bg'])
        save_frame.pack(fill=tk.X, pady=20, padx=5)
        
        add_btn = tk.Button(save_frame, text="➕ Add Trip",
                          font=('Helvetica', 12, 'bold'),
                          bg=COLORS['success'], fg=COLORS['text'],
                          bd=0, padx=30, pady=12, cursor='hand2',
                          command=self.add_new_trip)
        add_btn.pack()
    
    def add_new_trip(self):
        """Add a new trip to the list with all fields from the form."""
        # Validate required fields
        trip_id = self.edit_vars['id'].get().strip()
        trip_title = self.edit_vars['title'].get().strip()
        
        if not trip_id or not trip_title:
            messagebox.showerror("Error", "Trip ID and Title are required!")
            return
        
        # Check for duplicate ID
        for existing_trip in self.trips:
            if existing_trip.get('id') == trip_id:
                messagebox.showerror("Error", f"Trip ID '{trip_id}' already exists!\nPlease use a unique ID.")
                return
        
        # Get highlights from text
        highlights_text = self.highlights_text.get('1.0', tk.END).strip()
        highlights = [h.strip() for h in highlights_text.split('\n') if h.strip()]
        
        # Get inclusions from text
        inclusions_text = self.inclusions_text.get('1.0', tk.END).strip()
        inclusions = [i.strip() for i in inclusions_text.split('\n') if i.strip()]
        
        # Get exclusions from text
        exclusions_text = self.exclusions_text.get('1.0', tk.END).strip()
        exclusions = [e.strip() for e in exclusions_text.split('\n') if e.strip()]
        
        # Build image path - auto-complete if user just typed filename
        image_path = self.edit_vars['image'].get().strip()
        if not image_path or image_path == 'images/trips/':
            image_path = f"images/trips/{trip_id}.jpg"
        
        # Create trip object with all fields
        trip = {
            'id': trip_id,
            'title': trip_title,
            'location': self.edit_vars['location'].get().strip(),
            'badge': self.edit_vars['badge'].get().strip(),
            'price': self.edit_vars['price'].get().strip(),
            'duration': self.edit_vars['duration'].get().strip(),
            'difficulty': self.edit_vars['difficulty'].get().strip(),
            'groupSize': self.edit_vars['groupSize'].get().strip(),
            'image': image_path,
            'about': self.desc_text.get('1.0', tk.END).strip(),
            'availableDates': list(self.dates_listbox.get(0, tk.END)),
            'highlights': highlights,
            'itinerary': self.current_itinerary if hasattr(self, 'current_itinerary') else [],
            'inclusions': inclusions,
            'exclusions': exclusions,
        }
        
        self.trips.append(trip)
        self.unsaved_changes = True
        self.update_status(f"✅ Added new trip: {trip['title']}")
        messagebox.showinfo("Success", f"Trip '{trip['title']}' added!\n\nDon't forget to:\n1. Click 'Save Changes'\n2. Add trip image to images/trips/{trip_id}.jpg")
        self.show_trip_list()
    
    def delete_trip(self, index):
        """Delete a trip."""
        trip = self.trips[index]
        if messagebox.askyesno("Confirm Delete", 
                              f"Are you sure you want to delete '{trip.get('title')}'?"):
            del self.trips[index]
            self.unsaved_changes = True
            self.update_status(f"🗑️ Deleted trip: {trip.get('title')}")
            self.display_trips()
    
    def show_featured_trips(self):
        """Show featured trips management screen."""
        self.clear_content()
        
        # Load current featured trips
        self.featured_trip_ids = self.load_featured_trips()
        
        # Header
        header = tk.Frame(self.content_frame, bg=COLORS['bg'])
        header.pack(fill=tk.X, pady=(0, 20))
        
        tk.Label(header, text="⭐ Featured Trips (Homepage)", 
                font=('Helvetica', 24, 'bold'),
                bg=COLORS['bg'], fg=COLORS['text']).pack(side=tk.LEFT)
        
        tk.Label(self.content_frame, 
                text="Select up to 4 trips to display in the 'Upcoming Adventures' section on the homepage.",
                font=('Helvetica', 11),
                bg=COLORS['bg'], fg=COLORS['text_secondary']).pack(anchor='w', pady=(0, 20))
        
        # Main container
        main_frame = tk.Frame(self.content_frame, bg=COLORS['bg'])
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Left side - Available Trips
        left_frame = tk.Frame(main_frame, bg=COLORS['card'])
        left_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0, 10))
        
        tk.Label(left_frame, text="📋 Available Trips", 
                font=('Helvetica', 14, 'bold'),
                bg=COLORS['card'], fg=COLORS['text']).pack(anchor='w', padx=15, pady=(15, 10))
        
        # Available trips listbox
        avail_list_frame = tk.Frame(left_frame, bg=COLORS['card'])
        avail_list_frame.pack(fill=tk.BOTH, expand=True, padx=15, pady=(0, 15))
        
        self.available_listbox = tk.Listbox(avail_list_frame, height=15,
                                           font=('Helvetica', 11),
                                           bg=COLORS['input_bg'], fg=COLORS['text'],
                                           selectbackground=COLORS['accent'],
                                           selectmode=tk.SINGLE,
                                           bd=0, relief='flat')
        self.available_listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        avail_scrollbar = ttk.Scrollbar(avail_list_frame, orient="vertical", 
                                       command=self.available_listbox.yview)
        avail_scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.available_listbox.config(yscrollcommand=avail_scrollbar.set)
        
        # Populate available trips (excluding already featured ones)
        for trip in self.trips:
            trip_id = trip.get('id', '')
            if trip_id not in self.featured_trip_ids:
                self.available_listbox.insert(tk.END, f"{trip.get('title', 'Unknown')} [{trip_id}]")
        
        # Center - Action Buttons
        center_frame = tk.Frame(main_frame, bg=COLORS['bg'])
        center_frame.pack(side=tk.LEFT, fill=tk.Y, padx=10)
        
        # Spacer
        tk.Frame(center_frame, bg=COLORS['bg'], height=100).pack()
        
        add_btn = tk.Button(center_frame, text="➡️ Add",
                          font=('Helvetica', 11, 'bold'),
                          bg=COLORS['success'], fg=COLORS['text'],
                          bd=0, padx=20, pady=8, cursor='hand2',
                          command=self.add_to_featured)
        add_btn.pack(pady=5)
        
        remove_btn = tk.Button(center_frame, text="⬅️ Remove",
                             font=('Helvetica', 11, 'bold'),
                             bg='#dc3545', fg=COLORS['text'],
                             bd=0, padx=20, pady=8, cursor='hand2',
                             command=self.remove_from_featured)
        remove_btn.pack(pady=5)
        
        tk.Frame(center_frame, bg=COLORS['bg'], height=20).pack()
        
        move_up_btn = tk.Button(center_frame, text="🔼 Up",
                              font=('Helvetica', 11),
                              bg=COLORS['card'], fg=COLORS['text'],
                              bd=0, padx=20, pady=8, cursor='hand2',
                              command=self.move_featured_up)
        move_up_btn.pack(pady=5)
        
        move_down_btn = tk.Button(center_frame, text="🔽 Down",
                                font=('Helvetica', 11),
                                bg=COLORS['card'], fg=COLORS['text'],
                                bd=0, padx=20, pady=8, cursor='hand2',
                                command=self.move_featured_down)
        move_down_btn.pack(pady=5)
        
        # Right side - Featured Trips
        right_frame = tk.Frame(main_frame, bg=COLORS['card'])
        right_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(10, 0))
        
        tk.Label(right_frame, text="⭐ Featured on Homepage (max 4)", 
                font=('Helvetica', 14, 'bold'),
                bg=COLORS['card'], fg=COLORS['text']).pack(anchor='w', padx=15, pady=(15, 10))
        
        # Featured trips listbox
        feat_list_frame = tk.Frame(right_frame, bg=COLORS['card'])
        feat_list_frame.pack(fill=tk.BOTH, expand=True, padx=15, pady=(0, 15))
        
        self.featured_listbox = tk.Listbox(feat_list_frame, height=15,
                                          font=('Helvetica', 11),
                                          bg=COLORS['input_bg'], fg=COLORS['text'],
                                          selectbackground=COLORS['accent'],
                                          selectmode=tk.SINGLE,
                                          bd=0, relief='flat')
        self.featured_listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        feat_scrollbar = ttk.Scrollbar(feat_list_frame, orient="vertical", 
                                      command=self.featured_listbox.yview)
        feat_scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.featured_listbox.config(yscrollcommand=feat_scrollbar.set)
        
        # Populate featured trips
        self.refresh_featured_listbox()
        
        # Save button
        save_frame = tk.Frame(self.content_frame, bg=COLORS['bg'])
        save_frame.pack(fill=tk.X, pady=20)
        
        save_btn = tk.Button(save_frame, text="💾 Save Featured Trips",
                           font=('Helvetica', 12, 'bold'),
                           bg=COLORS['success'], fg=COLORS['text'],
                           bd=0, padx=30, pady=12, cursor='hand2',
                           command=self.save_featured_trips)
        save_btn.pack()
    
    def load_featured_trips(self):
        """Load featured trip IDs from file."""
        try:
            with open(FEATURED_TRIPS_FILE, 'r') as f:
                content = f.read()
            
            # Extract array from JS file
            match = re.search(r'const\s+featuredTripIds\s*=\s*\[([\s\S]*?)\]', content)
            if match:
                array_content = match.group(1)
                # Extract quoted strings
                ids = re.findall(r'["\']([^"\']+)["\']', array_content)
                return ids
        except FileNotFoundError:
            pass
        except Exception as e:
            print(f"Error loading featured trips: {e}")
        
        return ["netravati", "kerala", "ooty", "spiti"]  # Default
    
    def refresh_featured_listbox(self):
        """Refresh the featured listbox display."""
        self.featured_listbox.delete(0, tk.END)
        for i, trip_id in enumerate(self.featured_trip_ids):
            # Find trip title
            trip = next((t for t in self.trips if t.get('id') == trip_id), None)
            title = trip.get('title', 'Unknown') if trip else f"Unknown ({trip_id})"
            self.featured_listbox.insert(tk.END, f"{i+1}. {title} [{trip_id}]")
    
    def refresh_available_listbox(self):
        """Refresh the available listbox display."""
        self.available_listbox.delete(0, tk.END)
        for trip in self.trips:
            trip_id = trip.get('id', '')
            if trip_id not in self.featured_trip_ids:
                self.available_listbox.insert(tk.END, f"{trip.get('title', 'Unknown')} [{trip_id}]")
    
    def add_to_featured(self):
        """Add selected trip to featured list."""
        selection = self.available_listbox.curselection()
        if not selection:
            messagebox.showwarning("No Selection", "Please select a trip to add.")
            return
        
        if len(self.featured_trip_ids) >= 4:
            messagebox.showwarning("Limit Reached", "Maximum 4 featured trips allowed.\nRemove one first to add another.")
            return
        
        # Get selected item text and extract ID
        item_text = self.available_listbox.get(selection[0])
        trip_id = re.search(r'\[([^\]]+)\]$', item_text)
        if trip_id:
            trip_id = trip_id.group(1)
            self.featured_trip_ids.append(trip_id)
            self.refresh_featured_listbox()
            self.refresh_available_listbox()
            self.update_status(f"⭐ Added to featured: {trip_id}")
    
    def remove_from_featured(self):
        """Remove selected trip from featured list."""
        selection = self.featured_listbox.curselection()
        if not selection:
            messagebox.showwarning("No Selection", "Please select a trip to remove.")
            return
        
        # Get selected item text and extract ID
        item_text = self.featured_listbox.get(selection[0])
        trip_id = re.search(r'\[([^\]]+)\]$', item_text)
        if trip_id:
            trip_id = trip_id.group(1)
            self.featured_trip_ids.remove(trip_id)
            self.refresh_featured_listbox()
            self.refresh_available_listbox()
            self.update_status(f"❌ Removed from featured: {trip_id}")
    
    def move_featured_up(self):
        """Move selected featured trip up in the list."""
        selection = self.featured_listbox.curselection()
        if not selection or selection[0] == 0:
            return
        
        idx = selection[0]
        self.featured_trip_ids[idx], self.featured_trip_ids[idx-1] = \
            self.featured_trip_ids[idx-1], self.featured_trip_ids[idx]
        self.refresh_featured_listbox()
        self.featured_listbox.selection_set(idx-1)
    
    def move_featured_down(self):
        """Move selected featured trip down in the list."""
        selection = self.featured_listbox.curselection()
        if not selection or selection[0] >= len(self.featured_trip_ids) - 1:
            return
        
        idx = selection[0]
        self.featured_trip_ids[idx], self.featured_trip_ids[idx+1] = \
            self.featured_trip_ids[idx+1], self.featured_trip_ids[idx]
        self.refresh_featured_listbox()
        self.featured_listbox.selection_set(idx+1)
    
    def save_featured_trips(self):
        """Save featured trips to file."""
        try:
            content = '''// ============================================
// FEATURED TRIPS CONFIGURATION
// ============================================
// 
// These trips will be displayed on the homepage
// in the "Upcoming Adventures" section.
// 
// Edit using Trip Manager → ⭐ Featured Trips
// Last updated: ''' + datetime.now().strftime('%Y-%m-%d %H:%M') + '''
// ============================================

const featuredTripIds = [
'''
            for trip_id in self.featured_trip_ids:
                content += f'    "{trip_id}",\n'
            
            content += '''];

// Function to get featured trips data
function getFeaturedTrips() {
    return featuredTripIds.map(id => {
        const trip = tripsData[id];
        if (trip) {
            return { id, ...trip };
        }
        return null;
    }).filter(t => t !== null);
}
'''
            
            with open(FEATURED_TRIPS_FILE, 'w') as f:
                f.write(content)
            
            self.update_status("⭐ Featured trips saved!")
            messagebox.showinfo("Success", 
                              f"Featured trips saved!\n\nSelected trips:\n" + 
                              "\n".join([f"• {tid}" for tid in self.featured_trip_ids]))
        except Exception as e:
            messagebox.showerror("Error", f"Failed to save: {e}")

    def show_photo_manager(self):
        """Show photo management screen."""
        self.clear_content()
        
        # Header
        tk.Label(self.content_frame, text="🖼️ Photo Manager", 
                font=('Helvetica', 24, 'bold'),
                bg=COLORS['bg'], fg=COLORS['text']).pack(anchor='w', pady=(0, 10))
        
        tk.Label(self.content_frame, 
                text=f"Photos directory: {IMAGES_DIR}",
                font=('Helvetica', 10),
                bg=COLORS['bg'], fg=COLORS['text_secondary']).pack(anchor='w', pady=(0, 20))
        
        # Photos list
        photos_frame = tk.Frame(self.content_frame, bg=COLORS['card'])
        photos_frame.pack(fill=tk.BOTH, expand=True, pady=10)
        
        tk.Label(photos_frame, text="Current Trip Photos", 
                font=('Helvetica', 12, 'bold'),
                bg=COLORS['card'], fg=COLORS['text']).pack(anchor='w', padx=15, pady=(15, 10))
        
        # List existing photos
        if os.path.exists(IMAGES_DIR):
            photos = [f for f in os.listdir(IMAGES_DIR) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))]
        else:
            photos = []
        
        list_frame = tk.Frame(photos_frame, bg=COLORS['card'])
        list_frame.pack(fill=tk.BOTH, expand=True, padx=15, pady=10)
        
        self.photos_listbox = tk.Listbox(list_frame, height=10,
                                         font=('Helvetica', 11),
                                         bg=COLORS['input_bg'], fg=COLORS['text'],
                                         selectbackground=COLORS['accent'],
                                         bd=0, relief='flat')
        self.photos_listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        scrollbar = ttk.Scrollbar(list_frame, orient="vertical", 
                                 command=self.photos_listbox.yview)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.photos_listbox.config(yscrollcommand=scrollbar.set)
        
        for photo in sorted(photos):
            self.photos_listbox.insert(tk.END, photo)
        
        # Buttons
        btn_frame = tk.Frame(photos_frame, bg=COLORS['card'])
        btn_frame.pack(fill=tk.X, padx=15, pady=(0, 15))
        
        add_photo_btn = tk.Button(btn_frame, text="📁 Add Photo",
                                 font=('Helvetica', 11),
                                 bg=COLORS['accent'], fg=COLORS['text'],
                                 bd=0, padx=20, pady=8, cursor='hand2',
                                 command=self.add_photo)
        add_photo_btn.pack(side=tk.LEFT, padx=5)
        
        open_folder_btn = tk.Button(btn_frame, text="📂 Open Folder",
                                   font=('Helvetica', 11),
                                   bg=COLORS['card'], fg=COLORS['text'],
                                   bd=0, padx=20, pady=8, cursor='hand2',
                                   command=lambda: os.system(f'xdg-open "{IMAGES_DIR}"'))
        open_folder_btn.pack(side=tk.LEFT, padx=5)
        
        # Info
        info_frame = tk.Frame(self.content_frame, bg=COLORS['card'])
        info_frame.pack(fill=tk.X, pady=10)
        
        info_text = """
💡 Photo Tips:
• Name photos to match trip IDs (e.g., 'coorg.jpg' for trip ID 'coorg')
• Recommended size: 800x600 pixels or larger
• Supported formats: JPG, JPEG, PNG, WebP
• After adding photos, update the trip's 'image' path in Edit Trip
        """
        tk.Label(info_frame, text=info_text, font=('Helvetica', 10),
                bg=COLORS['card'], fg=COLORS['text_secondary'],
                justify=tk.LEFT).pack(padx=15, pady=15, anchor='w')
    
    def add_photo(self):
        """Add a new photo."""
        filetypes = [
            ('Image files', '*.jpg *.jpeg *.png *.webp'),
            ('All files', '*.*')
        ]
        filepath = filedialog.askopenfilename(
            title="Select Photo",
            filetypes=filetypes
        )
        
        if filepath:
            filename = os.path.basename(filepath)
            dest = os.path.join(IMAGES_DIR, filename)
            
            try:
                os.makedirs(IMAGES_DIR, exist_ok=True)
                shutil.copy2(filepath, dest)
                self.photos_listbox.insert(tk.END, filename)
                self.update_status(f"📷 Photo added: {filename}")
                messagebox.showinfo("Success", f"Photo '{filename}' added successfully!")
            except Exception as e:
                messagebox.showerror("Error", f"Failed to copy photo: {e}")
    
    def load_trips(self):
        """Load trips from JavaScript file."""
        try:
            with open(TRIPS_DATA_FILE, 'r') as f:
                content = f.read()
            
            # Try array format first: const tripsData = [...]
            match = re.search(r'const\s+tripsData\s*=\s*(\[[\s\S]*?\]);', content)
            if match:
                js_array = match.group(1)
                json_str = self.js_to_json(js_array)
                self.trips = json.loads(json_str)
                return
            
            # Try object format: const tripsData = {...}
            match = re.search(r'const\s+tripsData\s*=\s*(\{[\s\S]*?\});', content)
            if match:
                js_obj = match.group(1)
                json_str = self.js_to_json(js_obj)
                trips_dict = json.loads(json_str)
                # Convert object to array, adding 'id' field
                self.trips = []
                for trip_id, trip_data in trips_dict.items():
                    trip_data['id'] = trip_id
                    self.trips.append(trip_data)
                return
            
            self.trips = []
            messagebox.showwarning("Warning", "Could not parse trips data file.")
        except FileNotFoundError:
            self.trips = []
            messagebox.showerror("Error", f"Trips data file not found:\n{TRIPS_DATA_FILE}")
        except Exception as e:
            self.trips = []
            messagebox.showerror("Error", f"Error loading trips: {e}")
    
    def js_to_json(self, js_str):
        """Convert JavaScript object syntax to JSON."""
        result = []
        i = 0
        in_string = False
        string_char = None
        
        while i < len(js_str):
            char = js_str[i]
            
            # Handle string boundaries
            if char in '"\'':
                if not in_string:
                    in_string = True
                    string_char = char
                    result.append('"')  # Always use double quotes
                    i += 1
                    continue
                elif char == string_char:
                    # Check if escaped
                    if i > 0 and js_str[i-1] != '\\':
                        in_string = False
                        string_char = None
                        result.append('"')
                        i += 1
                        continue
            
            if in_string:
                # Inside string, keep as-is (but escape double quotes if using single-quoted string)
                if char == '"' and string_char == "'":
                    result.append('\\"')
                else:
                    result.append(char)
                i += 1
                continue
            
            # Outside string - handle unquoted keys
            if char.isalpha() or char == '_':
                # Collect the full identifier
                start = i
                while i < len(js_str) and (js_str[i].isalnum() or js_str[i] == '_'):
                    i += 1
                identifier = js_str[start:i]
                
                # Skip whitespace
                temp_i = i
                while temp_i < len(js_str) and js_str[temp_i] in ' \t\n\r':
                    temp_i += 1
                
                # Check if followed by colon (it's a key)
                if temp_i < len(js_str) and js_str[temp_i] == ':':
                    result.append(f'"{identifier}"')
                else:
                    # It's a value like true, false, null
                    if identifier == 'true':
                        result.append('true')
                    elif identifier == 'false':
                        result.append('false')
                    elif identifier == 'null':
                        result.append('null')
                    else:
                        result.append(f'"{identifier}"')
                continue
            
            result.append(char)
            i += 1
        
        json_str = ''.join(result)
        # Remove trailing commas
        json_str = re.sub(r',(\s*[}\]])', r'\1', json_str)
        return json_str
    
    def save_trips(self):
        """Save trips to JavaScript file."""
        try:
            # Generate JavaScript content
            js_content = self.generate_js_content()
            
            # Backup existing file
            if os.path.exists(TRIPS_DATA_FILE):
                backup_path = TRIPS_DATA_FILE + '.backup'
                shutil.copy2(TRIPS_DATA_FILE, backup_path)
            
            # Write new content
            with open(TRIPS_DATA_FILE, 'w') as f:
                f.write(js_content)
            
            # Update cache version in HTML files to force browser refresh
            cache_updated = self.update_cache_version()
            
            self.unsaved_changes = False
            self.update_status("💾 Changes saved successfully!")
            
            cache_msg = "\n\n✅ Cache-busting updated in HTML files." if cache_updated else ""
            messagebox.showinfo("Success", 
                              f"Changes saved to:\n{TRIPS_DATA_FILE}\n\nBackup created.{cache_msg}")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to save: {e}")
    
    def update_cache_version(self):
        """Update version parameter in HTML files to bust browser cache.
        
        This ensures users always get the latest trips-data.js when prices change.
        """
        import time
        version = int(time.time())  # Unix timestamp as version
        updated_count = 0
        
        # Pattern to match trips-data.js with or without existing version
        pattern = r'(src=["\']js/trips-data\.js)(\?v=\d+)?(["\'])'
        replacement = f'\\1?v={version}\\3'
        
        for html_file in HTML_FILES:
            try:
                if not os.path.exists(html_file):
                    continue
                
                with open(html_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Check if file has the script tag
                if 'trips-data.js' in content:
                    new_content = re.sub(pattern, replacement, content)
                    
                    if new_content != content:
                        with open(html_file, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        updated_count += 1
                        print(f"✅ Updated cache version in: {os.path.basename(html_file)}")
            except Exception as e:
                print(f"⚠️ Failed to update {html_file}: {e}")
        
        if updated_count > 0:
            print(f"🔄 Cache-busting: Updated {updated_count} HTML files with v={version}")
        
        return updated_count > 0
    
    def generate_js_content(self):
        """Generate JavaScript file content in object format."""
        header = '''// ============================================
// TEAM WEEKEND TREKKERS - TRIP DATABASE
// ============================================
// 
// Last updated: ''' + datetime.now().strftime('%Y-%m-%d %H:%M') + '''
// 
// 📸 PHOTOS: Put images in images/trips/tripid.jpg
// 💰 PRICES: Change the 'price' field
// 📅 DATES: Update 'availableDates' array
// ➕ NEW TRIP: Copy any trip block, change all fields
// ============================================

'''
        
        trips_js = "const tripsData = {\n"
        
        trip_entries = []
        for trip in self.trips:
            trip_id = trip.get('id', 'unknown')
            # Quote the key if it contains special characters like hyphens
            if '-' in trip_id or not trip_id.isidentifier():
                entry = f'    "{trip_id}": {{\n'
            else:
                entry = f"    {trip_id}: {{\n"
            
            for key, value in trip.items():
                if key == 'id':  # Skip id as it's the key
                    continue
                if isinstance(value, str):
                    # Properly escape special characters for JavaScript strings
                    escaped = value.replace('\\', '\\\\')  # Backslashes first
                    escaped = escaped.replace('"', '\\"')   # Double quotes
                    escaped = escaped.replace('\n', '\\n')  # Newlines
                    escaped = escaped.replace('\r', '\\r')  # Carriage returns
                    escaped = escaped.replace('\t', '\\t')  # Tabs
                    entry += f'        {key}: "{escaped}",\n'
                elif isinstance(value, list):
                    if all(isinstance(item, str) for item in value):
                        # Simple string array
                        escaped_items = []
                        for item in value:
                            esc = item.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
                            escaped_items.append(f'"{esc}"')
                        items = ', '.join(escaped_items)
                        entry += f'        {key}: [{items}],\n'
                    elif key == 'itinerary':
                        # Format itinerary with unquoted keys (JS style)
                        entry += f'        {key}: [\n'
                        itinerary_items = []
                        for item in value:
                            day = item.get('day', '')
                            title = item.get('title', '')
                            activities = item.get('activities', [])
                            activities_str = ', '.join([f'"{a}"' for a in activities])
                            itinerary_items.append(f'            {{day: "{day}", title: "{title}", activities: [{activities_str}]}}')
                        entry += ',\n'.join(itinerary_items)
                        entry += '\n        ],\n'
                    else:
                        # Other complex arrays - use compact format
                        json_str = json.dumps(value)
                        entry += f'        {key}: {json_str},\n'
                elif isinstance(value, (int, float)):
                    entry += f'        {key}: {value},\n'
                elif isinstance(value, bool):
                    entry += f"        {key}: {'true' if value else 'false'},\n"
                else:
                    entry += f'        {key}: {json.dumps(value)},\n'
            
            entry += "    }"
            trip_entries.append(entry)
        
        trips_js += ",\n".join(trip_entries)
        trips_js += "\n};\n\n"
        
        # Add helper function
        trips_js += """function getTripData(tripId) {
    return tripsData[tripId] || tripsData['netravati'];
}
"""
        
        return header + trips_js
    
    def deploy_site(self):
        """Show deployment options."""
        deploy_window = tk.Toplevel(self.root)
        deploy_window.title("🚀 Deploy Website")
        deploy_window.geometry("500x400")
        deploy_window.configure(bg=COLORS['bg'])
        deploy_window.transient(self.root)
        deploy_window.grab_set()
        
        tk.Label(deploy_window, text="🚀 Deploy Website",
                font=('Helvetica', 20, 'bold'),
                bg=COLORS['bg'], fg=COLORS['text']).pack(pady=20)
        
        # Instructions
        info_frame = tk.Frame(deploy_window, bg=COLORS['card'])
        info_frame.pack(fill=tk.X, padx=20, pady=10)
        
        instructions = """
After saving your changes, deploy your website:

📁 Option 1: Static Hosting
   Upload all files to your web host

🔗 Option 2: GitHub Pages
   Push to GitHub and enable Pages

☁️ Option 3: Netlify/Vercel
   Connect your repo for auto-deploy

🖥️ Option 4: Local Preview
   Run a local server to test changes
        """
        
        tk.Label(info_frame, text=instructions,
                font=('Helvetica', 11),
                bg=COLORS['card'], fg=COLORS['text'],
                justify=tk.LEFT).pack(padx=20, pady=20)
        
        # Local preview button
        btn_frame = tk.Frame(deploy_window, bg=COLORS['bg'])
        btn_frame.pack(pady=20)
        
        preview_btn = tk.Button(btn_frame, text="🌐 Start Local Preview",
                               font=('Helvetica', 12, 'bold'),
                               bg=COLORS['accent'], fg=COLORS['text'],
                               bd=0, padx=30, pady=12, cursor='hand2',
                               command=lambda: self.start_local_server(deploy_window))
        preview_btn.pack(pady=5)
        
        open_folder_btn = tk.Button(btn_frame, text="📂 Open Project Folder",
                                   font=('Helvetica', 11),
                                   bg=COLORS['card'], fg=COLORS['text'],
                                   bd=0, padx=20, pady=8, cursor='hand2',
                                   command=lambda: os.system(f'xdg-open "{PROJECT_ROOT}"'))
        open_folder_btn.pack(pady=5)
    
    def start_local_server(self, parent_window):
        """Start a local HTTP server."""
        import subprocess
        import webbrowser
        
        try:
            # Start server in background
            subprocess.Popen(
                ['python3', '-m', 'http.server', '8080'],
                cwd=PROJECT_ROOT,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            
            # Open browser
            webbrowser.open('http://localhost:8080')
            
            messagebox.showinfo("Server Started",
                              "Local server running at:\nhttp://localhost:8080\n\n"
                              "Close the terminal to stop the server.")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to start server: {e}")
    
    def update_status(self, message):
        """Update status bar message."""
        self.status_label.config(text=message)
    
    def on_close(self):
        """Handle window close."""
        if self.unsaved_changes:
            if messagebox.askyesno("Unsaved Changes",
                                  "You have unsaved changes. Save before closing?"):
                self.save_trips()
        self.root.destroy()
    
    def git_push_changes(self, commit_message="Updated trips"):
        """Push changes to GitHub in background."""
        def push_thread():
            try:
                # Check if git is available
                result = subprocess.run(['git', '--version'], 
                                       capture_output=True, text=True, 
                                       cwd=PROJECT_ROOT)
                if result.returncode != 0:
                    return
                
                # Check for changes
                result = subprocess.run(['git', 'status', '--porcelain'],
                                       capture_output=True, text=True,
                                       cwd=PROJECT_ROOT)
                if not result.stdout.strip():
                    return  # No changes
                
                # Git add
                subprocess.run(['git', 'add', '-A'], 
                              capture_output=True, cwd=PROJECT_ROOT)
                
                # Git commit
                subprocess.run(['git', 'commit', '-m', commit_message],
                              capture_output=True, cwd=PROJECT_ROOT)
                
                # Git push
                result = subprocess.run(['git', 'push', 'origin', 'main'],
                                       capture_output=True, text=True,
                                       cwd=PROJECT_ROOT, timeout=120)
                
                if result.returncode == 0:
                    self.root.after(0, lambda: self.update_status("☁️ Pushed to GitHub!"))
                    
            except Exception as e:
                print(f"Git push error: {e}")
        
        thread = threading.Thread(target=push_thread, daemon=True)
        thread.start()
    
    def deploy_to_github(self):
        """Deploy changes to GitHub with robust error handling and auto-recovery."""
        print("DEBUG: deploy_to_github() method called!")
        
        # Create deployment dialog
        deploy_win = tk.Toplevel(self.root)
        deploy_win.title("🚀 Deploy to GitHub")
        deploy_win.geometry("600x580")
        deploy_win.minsize(550, 550)
        deploy_win.configure(bg=COLORS['bg'])
        deploy_win.transient(self.root)
        deploy_win.grab_set()
        
        # === BUTTONS FIRST (at bottom) ===
        btn_frame = tk.Frame(deploy_win, bg=COLORS['bg'])
        btn_frame.pack(side=tk.BOTTOM, fill=tk.X, padx=20, pady=15)
        
        # Placeholder for deploy_btn - will be configured later
        deploy_btn = tk.Button(btn_frame, text="🚀 Deploy Now",
                              font=('Helvetica', 12, 'bold'),
                              bg=COLORS['success'], fg=COLORS['text'],
                              bd=0, padx=30, pady=12, cursor='hand2')
        deploy_btn.pack(side=tk.LEFT, padx=5)
        
        cancel_btn = tk.Button(btn_frame, text="Cancel",
                              font=('Helvetica', 11),
                              bg=COLORS['card'], fg=COLORS['text'],
                              bd=0, padx=25, pady=10, cursor='hand2',
                              command=deploy_win.destroy)
        cancel_btn.pack(side=tk.RIGHT, padx=5)
        
        # === HEADER ===
        header = tk.Frame(deploy_win, bg=COLORS['sidebar'])
        header.pack(fill=tk.X)
        
        tk.Label(header, text="🚀 Deploy to GitHub",
                font=('Helvetica', 18, 'bold'),
                bg=COLORS['sidebar'], fg=COLORS['text']).pack(pady=20)
        
        # Info text
        tk.Label(deploy_win, text="Push your changes to GitHub to update the live website.",
                font=('Helvetica', 10),
                bg=COLORS['bg'], fg=COLORS['text_secondary']).pack(pady=(15, 5))
        
        # === COMMIT MESSAGE ===
        msg_frame = tk.Frame(deploy_win, bg=COLORS['card'])
        msg_frame.pack(fill=tk.X, padx=20, pady=15)
        
        tk.Label(msg_frame, text="📝 Commit Message:",
                font=('Helvetica', 11, 'bold'),
                bg=COLORS['card'], fg=COLORS['text']).pack(anchor='w', padx=15, pady=(15, 5))
        
        commit_entry = tk.Entry(msg_frame, font=('Helvetica', 11),
                               bg=COLORS['input_bg'], fg=COLORS['text'],
                               insertbackground=COLORS['text'], bd=0)
        commit_entry.pack(fill=tk.X, padx=15, pady=(0, 15), ipady=10)
        commit_entry.insert(0, "")  # Will be auto-generated
        
        # Auto-generate button
        def generate_commit_msg():
            """Generate detailed commit message based on changed files."""
            try:
                result = subprocess.run(['git', 'status', '--porcelain'],
                                       capture_output=True, text=True, cwd=PROJECT_ROOT)
                if not result.stdout.strip():
                    commit_entry.delete(0, tk.END)
                    commit_entry.insert(0, "No changes to commit")
                    return
                
                lines = [l for l in result.stdout.strip().split('\n') if l]
                
                # Categorize changes
                added = []
                modified = []
                deleted = []
                
                for line in lines:
                    status = line[:2].strip()
                    filepath = line[3:].strip()
                    filename = os.path.basename(filepath)
                    
                    if status in ['A', '??']:
                        added.append(filename)
                    elif status == 'D':
                        deleted.append(filename)
                    else:  # M, MM, etc.
                        modified.append(filename)
                
                # Build commit message
                parts = []
                timestamp = datetime.now().strftime('%Y-%m-%d %H:%M')
                
                # Detect specific changes
                trips_changed = any('trips-data' in f for f in modified + added)
                featured_changed = any('featured-trips' in f for f in modified + added)
                style_changed = any(f.endswith('.css') for f in modified + added)
                html_changed = any(f.endswith('.html') for f in modified + added)
                js_changed = any(f.endswith('.js') and 'trips-data' not in f and 'featured-trips' not in f 
                                for f in modified + added)
                
                if trips_changed:
                    parts.append("Update trips data")
                if featured_changed:
                    parts.append("Update featured trips")
                if style_changed:
                    parts.append("Update styles")
                if html_changed:
                    parts.append("Update pages")
                if js_changed:
                    parts.append("Update scripts")
                
                if added:
                    parts.append(f"Add {len(added)} file(s)")
                if deleted:
                    parts.append(f"Remove {len(deleted)} file(s)")
                
                if not parts:
                    parts.append(f"Update {len(lines)} file(s)")
                
                # Create summary
                summary = " | ".join(parts[:3])  # Max 3 parts in summary
                
                # Create detailed message
                details = []
                if modified:
                    details.append(f"Modified: {', '.join(modified[:5])}")
                    if len(modified) > 5:
                        details.append(f"  ...and {len(modified) - 5} more")
                if added:
                    details.append(f"Added: {', '.join(added[:3])}")
                if deleted:
                    details.append(f"Deleted: {', '.join(deleted[:3])}")
                
                full_msg = f"{summary} [{timestamp}]"
                if details:
                    full_msg += "\n\n" + "\n".join(details)
                
                commit_entry.delete(0, tk.END)
                commit_entry.insert(0, full_msg.split('\n')[0])  # Only first line in entry
                
                # Store full message for commit
                self._full_commit_msg = full_msg
                
            except Exception as e:
                commit_entry.delete(0, tk.END)
                commit_entry.insert(0, f"Updated - {datetime.now().strftime('%Y-%m-%d %H:%M')}")
                self._full_commit_msg = None
        
        # Generate initial commit message
        self._full_commit_msg = None
        deploy_win.after(100, generate_commit_msg)
        
        # Refresh button
        refresh_btn = tk.Button(msg_frame, text="🔄", font=('Helvetica', 10),
                               bg=COLORS['card'], fg=COLORS['text'],
                               bd=0, cursor='hand2', command=generate_commit_msg)
        refresh_btn.place(relx=0.95, rely=0.6, anchor='e')
        
        # === STATUS LOG ===
        log_frame = tk.Frame(deploy_win, bg=COLORS['card'])
        log_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=10)
        
        tk.Label(log_frame, text="📋 Deployment Log:",
                font=('Helvetica', 11, 'bold'),
                bg=COLORS['card'], fg=COLORS['text']).pack(anchor='w', padx=15, pady=(15, 5))
        
        log_text = tk.Text(log_frame, height=10, font=('Consolas', 10),
                          bg=COLORS['input_bg'], fg=COLORS['text'], bd=0)
        log_text.pack(fill=tk.BOTH, expand=True, padx=15, pady=(0, 15))
        
        # Store references
        self._deploy_log_text = log_text
        self._deploy_win = deploy_win
        self._commit_entry = commit_entry
        self._deploy_btn = deploy_btn
        
        def log(msg):
            """Thread-safe logging."""
            def _update():
                self._deploy_log_text.insert(tk.END, f"{msg}\n")
                self._deploy_log_text.see(tk.END)
            self._deploy_win.after(0, _update)
        
        self._deploy_log = log
        
        def run_git_command(args, timeout=60, allow_fail=False):
            """Run a git command and return (success, output)."""
            try:
                result = subprocess.run(
                    ['git'] + args,
                    capture_output=True, text=True,
                    cwd=PROJECT_ROOT, timeout=timeout
                )
                output = (result.stdout + ' ' + result.stderr).strip()
                success = result.returncode == 0
                return success, output, result.returncode
            except subprocess.TimeoutExpired:
                return False, "Command timed out", -1
            except FileNotFoundError:
                return False, "Git not found", -1
            except Exception as e:
                return False, str(e), -1
        
        def do_deploy():
            print("DEBUG: do_deploy() clicked!")
            self._deploy_btn.config(state=tk.DISABLED, text="⏳ Deploying...")
            log("🚀 Starting deployment...")
            log("")
            
            def deploy_thread():
                try:
                    # Use full commit message if available, otherwise use entry text
                    user_msg = self._commit_entry.get().strip()
                    if hasattr(self, '_full_commit_msg') and self._full_commit_msg:
                        commit_msg = self._full_commit_msg
                    else:
                        commit_msg = user_msg or f"Updated - {datetime.now().strftime('%Y-%m-%d %H:%M')}"
                    
                    # Step 1: Verify git repository
                    log("📂 Step 1/7: Verifying Git repository...")
                    success, output, _ = run_git_command(['rev-parse', '--git-dir'])
                    if not success:
                        log(f"❌ Not a git repository: {output}")
                        return
                    log("   ✅ Git repository verified")
                    
                    # Step 2: Check remote configuration
                    log("🔗 Step 2/7: Checking remote configuration...")
                    success, output, _ = run_git_command(['remote', '-v'])
                    if 'origin' not in output:
                        log("❌ No 'origin' remote configured!")
                        log("   Run: git remote add origin <your-repo-url>")
                        return
                    # Extract and show remote URL (mask sensitive parts)
                    remote_url = output.split('\n')[0] if output else 'unknown'
                    log(f"   ✅ Remote: {remote_url.split()[1] if len(remote_url.split()) > 1 else 'configured'}")
                    
                    # Step 3: Check for uncommitted changes and build detailed message
                    log("🔍 Step 3/7: Analyzing changes...")
                    success, output, _ = run_git_command(['status', '--porcelain'])
                    
                    if not output.strip():
                        log("   ⚠️ No local changes to deploy")
                        log("")
                        log("   Checking if we're ahead of remote...")
                        success, ahead_output, _ = run_git_command(['rev-list', '--count', 'origin/main..HEAD'])
                        if success and ahead_output.strip() != '0':
                            log(f"   📤 Found {ahead_output.strip()} unpushed commit(s)")
                        else:
                            log("   ✅ Already up to date with remote!")
                            self._deploy_win.after(0, lambda: self._deploy_btn.config(state=tk.NORMAL, text="🚀 Deploy Now"))
                            return
                    else:
                        # Parse and display changed files
                        lines = [l for l in output.strip().split('\n') if l]
                        log(f"   📁 Found {len(lines)} changed file(s):")
                        
                        # Categorize and show changes
                        for line in lines[:10]:  # Show first 10
                            status = line[:2].strip()
                            filepath = line[3:].strip()
                            status_icon = {'M': '📝', 'A': '➕', 'D': '🗑️', '??': '🆕'}.get(status, '📄')
                            status_text = {'M': 'Modified', 'A': 'Added', 'D': 'Deleted', '??': 'New'}.get(status, 'Changed')
                            log(f"      {status_icon} {status_text}: {filepath}")
                        
                        if len(lines) > 10:
                            log(f"      ... and {len(lines) - 10} more files")
                    
                    # Step 4: Stash any uncommitted changes before fetch (safety)
                    log("💾 Step 4/7: Staging and committing changes...")
                    # Stage all changes first
                    success, output, _ = run_git_command(['add', '-A'])
                    if not success:
                        log(f"   ⚠️ Staging warning: {output}")
                    log("   ✅ Changes staged")
                    
                    # Show commit message summary
                    commit_summary = commit_msg.split('\n')[0]  # First line only
                    log(f"   📝 Commit: {commit_summary[:60]}{'...' if len(commit_summary) > 60 else ''}")
                    
                    # Show if detailed message
                    if '\n' in commit_msg:
                        log("   📋 (Detailed description included)")
                    
                    success, output, code = run_git_command(['commit', '-m', commit_msg])
                    if not success:
                        if 'nothing to commit' in output.lower():
                            log("   ℹ️ No new changes to commit")
                        else:
                            log(f"   ⚠️ Commit note: {output[:100]}")
                    else:
                        log("   ✅ Changes committed successfully")
                    
                    # Step 5: Fetch latest from remote
                    log("📥 Step 5/7: Fetching latest from remote...")
                    success, output, _ = run_git_command(['fetch', 'origin', 'main'], timeout=60)
                    if not success:
                        log(f"   ⚠️ Fetch warning: {output[:100]}")
                        log("   Continuing anyway...")
                    else:
                        log("   ✅ Fetched latest changes")
                    
                    # Step 6: Rebase onto remote (handles diverged histories)
                    log("🔄 Step 6/7: Rebasing local changes...")
                    
                    # Check if we need to rebase
                    success, behind_output, _ = run_git_command(['rev-list', '--count', 'HEAD..origin/main'])
                    behind_count = int(behind_output.strip()) if success and behind_output.strip().isdigit() else 0
                    
                    if behind_count > 0:
                        log(f"   📥 Remote has {behind_count} new commit(s)")
                        
                        # Try rebase
                        success, output, code = run_git_command(['rebase', 'origin/main'], timeout=120)
                        
                        if not success:
                            # Check for conflicts
                            if 'conflict' in output.lower() or 'could not apply' in output.lower():
                                log("   ⚠️ Merge conflict detected!")
                                log("   🔧 Attempting automatic resolution...")
                                
                                # Abort the failed rebase
                                run_git_command(['rebase', '--abort'])
                                
                                # Try merge instead with ours strategy for conflicts
                                log("   🔀 Trying merge strategy...")
                                success, output, _ = run_git_command(['merge', 'origin/main', '-X', 'ours', '-m', 'Merge remote changes'])
                                
                                if not success:
                                    log(f"   ❌ Auto-merge failed: {output[:100]}")
                                    log("")
                                    log("   💡 Manual fix needed:")
                                    log("   1. Open terminal in project folder")
                                    log("   2. Run: git status")
                                    log("   3. Resolve conflicts in listed files")
                                    log("   4. Run: git add . && git commit")
                                    log("   5. Try Deploy again")
                                    return
                                else:
                                    log("   ✅ Merged with remote (kept local changes)")
                            else:
                                log(f"   ⚠️ Rebase issue: {output[:100]}")
                                # Abort any in-progress rebase
                                run_git_command(['rebase', '--abort'])
                        else:
                            log("   ✅ Rebased successfully")
                    else:
                        log("   ✅ Already up to date with remote")
                    
                    # Step 7: Push to remote
                    log("☁️ Step 7/7: Pushing to GitHub...")
                    log("   (This may take a moment...)")
                    
                    # Try normal push first
                    success, output, code = run_git_command(['push', 'origin', 'main'], timeout=120)
                    
                    if not success:
                        output_lower = output.lower()
                        
                        # Check for common push failures
                        if 'rejected' in output_lower or 'non-fast-forward' in output_lower:
                            log("   ⚠️ Push rejected - remote has newer changes")
                            log("   🔄 Attempting force-with-lease (safe force)...")
                            
                            # Use force-with-lease (safer than force)
                            success, output, _ = run_git_command(['push', '--force-with-lease', 'origin', 'main'], timeout=120)
                            
                            if not success:
                                log(f"   ❌ Force push also failed: {output[:100]}")
                                log("")
                                log("   💡 Try: git push -f origin main (manual)")
                                return
                            else:
                                log("   ✅ Force pushed successfully")
                        
                        elif 'permission denied' in output_lower or 'authentication' in output_lower:
                            log("   ❌ Authentication failed!")
                            log("   💡 Check your SSH keys or credentials")
                            log("   Run: ssh -T git@github.com")
                            return
                        
                        elif 'could not resolve' in output_lower or 'network' in output_lower:
                            log("   ❌ Network error!")
                            log("   💡 Check your internet connection")
                            return
                        
                        else:
                            log(f"   ❌ Push failed: {output[:150]}")
                            return
                    
                    # Success!
                    output_lower = output.lower()
                    if 'up-to-date' in output_lower or 'everything up-to-date' in output_lower:
                        log("   ✅ Already up to date!")
                    else:
                        log("   ✅ Pushed successfully!")
                    
                    log("")
                    log("═" * 45)
                    log("🎉 DEPLOYMENT SUCCESSFUL!")
                    log("═" * 45)
                    log("🌐 Website will update in 1-2 minutes.")
                    log("")
                    
                    self._deploy_win.after(0, lambda: messagebox.showinfo("Success", 
                        "✅ Deployed successfully!\n\nYour website will update in 1-2 minutes."))
                    
                except Exception as e:
                    log(f"❌ Unexpected error: {str(e)}")
                    import traceback
                    log(traceback.format_exc())
                finally:
                    self._deploy_win.after(0, lambda: self._deploy_btn.config(state=tk.NORMAL, text="🚀 Deploy Now"))
            
            threading.Thread(target=deploy_thread, daemon=True).start()
        
        # Now configure the button command
        deploy_btn.config(command=do_deploy)


def main():
    root = tk.Tk()
    app = TripManagerApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
