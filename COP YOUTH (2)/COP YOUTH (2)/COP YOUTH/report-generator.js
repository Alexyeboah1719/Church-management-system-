// PDF Report Generation System
// Uses jsPDF and jsPDF-AutoTable for PDF generation

// Wait for jsPDF to load
let jsPDFReady = false;
let autoTableReady = false;

// Check if libraries are loaded
function checkLibraries() {
    jsPDFReady = typeof window.jspdf !== 'undefined';
    autoTableReady = typeof window.jspdf?.jsPDF?.API?.autoTable !== 'undefined';
    return jsPDFReady && autoTableReady;
}

// Initialize report generation
function initializeReportGeneration() {
    if (!checkLibraries()) {
        console.error('jsPDF or autoTable not loaded');
        return false;
    }
    return true;
}

// Generate Members Report
async function generateMembersReport(filters = {}) {
    if (!initializeReportGeneration()) {
        alert('PDF library not loaded. Please refresh the page.');
        return;
    }

    try {
        // Fetch members data
        const membersResult = await window.supabaseDB.getMembers();
        let members = membersResult.success ? membersResult.data : [];

        // Apply filters
        if (filters.status && filters.status !== 'all') {
            members = members.filter(m => m.status === filters.status);
        }
        if (filters.active !== undefined && filters.active !== 'all') {
            members = members.filter(m => m.active === (filters.active === 'true'));
        }
        if (filters.role && filters.role !== 'all') {
            members = members.filter(m => m.roles && m.roles.includes(filters.role));
        }
        if (filters.startDate) {
            members = members.filter(m => new Date(m.date_joined || m.created_at) >= new Date(filters.startDate));
        }
        if (filters.endDate) {
            members = members.filter(m => new Date(m.date_joined || m.created_at) <= new Date(filters.endDate));
        }

        // Create PDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Add header
        addReportHeader(doc, 'Members Report');

        // Add filter information
        let yPos = 40;
        doc.setFontSize(10);
        doc.text(`Total Members: ${members.length}`, 14, yPos);
        yPos += 6;
        if (filters.status && filters.status !== 'all') {
            doc.text(`Status Filter: ${filters.status}`, 14, yPos);
            yPos += 6;
        }
        if (filters.active !== undefined && filters.active !== 'all') {
            doc.text(`Active Filter: ${filters.active === 'true' ? 'Active' : 'Inactive'}`, 14, yPos);
            yPos += 6;
        }

        // Prepare table data
        const tableData = members.map(member => [
            member.name,
            member.email,
            member.phone || 'N/A',
            member.status,
            member.active ? 'Active' : 'Inactive',
            formatDate(member.date_joined || member.created_at),
            (member.roles && member.roles.length > 0) ? member.roles.join(', ') : 'None'
        ]);

        // Add table
        doc.autoTable({
            startY: yPos + 5,
            head: [['Name', 'Email', 'Phone', 'Status', 'Active', 'Joined', 'Roles']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [0, 30, 60] },
            styles: { fontSize: 8 },
            columnStyles: {
                0: { cellWidth: 30 },
                1: { cellWidth: 40 },
                2: { cellWidth: 25 },
                3: { cellWidth: 20 },
                4: { cellWidth: 18 },
                5: { cellWidth: 25 },
                6: { cellWidth: 30 }
            }
        });

        // Add footer
        addReportFooter(doc);

        // Save PDF
        doc.save(`Members_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        
        return true;
    } catch (error) {
        console.error('Error generating members report:', error);
        alert('Error generating report. Please try again.');
        return false;
    }
}

// Generate Events Report
async function generateEventsReport(filters = {}) {
    if (!initializeReportGeneration()) {
        alert('PDF library not loaded. Please refresh the page.');
        return;
    }

    try {
        // Fetch events and attendance data
        const eventsResult = await window.supabaseDB.getEvents();
        let events = eventsResult.success ? eventsResult.data : [];

        const attendanceResult = await window.supabaseDB.getAttendance();
        const attendance = attendanceResult.success ? attendanceResult.data : [];

        const membersResult = await window.supabaseDB.getMembers();
        const members = membersResult.success ? membersResult.data : [];
        const totalMembers = members.filter(m => m.status === 'approved' && m.active).length;

        // Apply filters
        if (filters.type && filters.type !== 'all') {
            events = events.filter(e => e.type === filters.type);
        }
        if (filters.startDate) {
            events = events.filter(e => new Date(e.event_date || e.date) >= new Date(filters.startDate));
        }
        if (filters.endDate) {
            events = events.filter(e => new Date(e.event_date || e.date) <= new Date(filters.endDate));
        }
        if (filters.period === 'upcoming') {
            events = events.filter(e => new Date(e.event_date || e.date) >= new Date().setHours(0, 0, 0, 0));
        } else if (filters.period === 'past') {
            events = events.filter(e => new Date(e.event_date || e.date) < new Date().setHours(0, 0, 0, 0));
        }

        // Sort by date
        events.sort((a, b) => new Date(b.event_date || b.date) - new Date(a.event_date || a.date));

        // Create PDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Add header
        addReportHeader(doc, 'Events Report');

        // Add summary
        let yPos = 40;
        doc.setFontSize(10);
        doc.text(`Total Events: ${events.length}`, 14, yPos);
        yPos += 6;

        // Calculate statistics
        const totalAttendance = events.reduce((sum, event) => {
            return sum + attendance.filter(a => a.event_id === event.id).length;
        }, 0);
        const avgAttendance = events.length > 0 ? Math.round(totalAttendance / events.length) : 0;

        doc.text(`Average Attendance: ${avgAttendance} members per event`, 14, yPos);
        yPos += 6;

        // Prepare table data
        const tableData = events.map(event => {
            const eventAttendance = attendance.filter(a => a.event_id === event.id);
            const attendanceCount = eventAttendance.length;
            const attendanceRate = totalMembers > 0 ? Math.round((attendanceCount / totalMembers) * 100) : 0;

            return [
                event.title,
                formatDate(event.event_date || event.date),
                event.event_time || event.time || 'N/A',
                event.venue,
                `${attendanceCount}/${totalMembers}`,
                `${attendanceRate}%`
            ];
        });

        // Add table
        doc.autoTable({
            startY: yPos + 5,
            head: [['Event Title', 'Date', 'Time', 'Venue', 'Attendance', 'Rate']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [0, 30, 60] },
            styles: { fontSize: 8 },
            columnStyles: {
                0: { cellWidth: 50 },
                1: { cellWidth: 30 },
                2: { cellWidth: 25 },
                3: { cellWidth: 40 },
                4: { cellWidth: 25 },
                5: { cellWidth: 18 }
            }
        });

        // Add footer
        addReportFooter(doc);

        // Save PDF
        doc.save(`Events_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        
        return true;
    } catch (error) {
        console.error('Error generating events report:', error);
        alert('Error generating report. Please try again.');
        return false;
    }
}

// Generate Attendance Report
async function generateAttendanceReport(filters = {}) {
    if (!initializeReportGeneration()) {
        alert('PDF library not loaded. Please refresh the page.');
        return;
    }

    try {
        // Fetch data
        const eventsResult = await window.supabaseDB.getEvents();
        let events = eventsResult.success ? eventsResult.data : [];

        const attendanceResult = await window.supabaseDB.getAttendance();
        const attendance = attendanceResult.success ? attendanceResult.data : [];

        const membersResult = await window.supabaseDB.getMembers();
        const members = membersResult.success ? membersResult.data : [];
        const approvedMembers = members.filter(m => m.status === 'approved' && m.active);

        // Apply date filters
        if (filters.startDate) {
            events = events.filter(e => new Date(e.event_date || e.date) >= new Date(filters.startDate));
        }
        if (filters.endDate) {
            events = events.filter(e => new Date(e.event_date || e.date) <= new Date(filters.endDate));
        }

        // Filter for specific event if provided
        if (filters.eventId && filters.eventId !== 'all') {
            events = events.filter(e => e.id === filters.eventId);
        }

        // Sort by date
        events.sort((a, b) => new Date(b.event_date || b.date) - new Date(a.event_date || a.date));

        // Create PDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Add header
        addReportHeader(doc, 'Attendance Report');

        // Add summary
        let yPos = 40;
        doc.setFontSize(10);
        doc.text(`Report Period: ${filters.startDate || 'All time'} to ${filters.endDate || 'Present'}`, 14, yPos);
        yPos += 6;
        doc.text(`Total Events: ${events.length}`, 14, yPos);
        yPos += 6;
        doc.text(`Total Members: ${approvedMembers.length}`, 14, yPos);
        yPos += 10;

        // If specific event, show detailed attendance
        if (filters.eventId && filters.eventId !== 'all') {
            const event = events[0];
            if (event) {
                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.text(`Event: ${event.title}`, 14, yPos);
                yPos += 6;
                doc.setFontSize(10);
                doc.setFont(undefined, 'normal');
                doc.text(`Date: ${formatDate(event.event_date || event.date)} | Time: ${event.event_time || event.time}`, 14, yPos);
                yPos += 6;
                doc.text(`Venue: ${event.venue}`, 14, yPos);
                yPos += 10;

                // Get attendance for this event
                const eventAttendance = attendance.filter(a => a.event_id === event.id);
                const presentMembers = approvedMembers.filter(m => 
                    eventAttendance.some(a => a.member_id === m.id)
                );
                const absentMembers = approvedMembers.filter(m => 
                    !eventAttendance.some(a => a.member_id === m.id)
                );

                // Prepare table data
                const tableData = approvedMembers.map(member => {
                    const isPresent = eventAttendance.some(a => a.member_id === member.id);
                    return [
                        member.name,
                        member.email,
                        member.phone || 'N/A',
                        isPresent ? 'Present' : 'Absent'
                    ];
                });

                // Add table
                doc.autoTable({
                    startY: yPos,
                    head: [['Member Name', 'Email', 'Phone', 'Status']],
                    body: tableData,
                    theme: 'striped',
                    headStyles: { fillColor: [0, 30, 60] },
                    styles: { fontSize: 9 },
                    columnStyles: {
                        0: { cellWidth: 45 },
                        1: { cellWidth: 55 },
                        2: { cellWidth: 35 },
                        3: { cellWidth: 25 }
                    },
                    didParseCell: function(data) {
                        if (data.column.index === 3 && data.cell.section === 'body') {
                            if (data.cell.raw === 'Present') {
                                data.cell.styles.textColor = [0, 128, 0];
                                data.cell.styles.fontStyle = 'bold';
                            } else {
                                data.cell.styles.textColor = [255, 0, 0];
                            }
                        }
                    }
                });

                // Add summary at the end
                const finalY = doc.lastAutoTable.finalY + 10;
                doc.setFontSize(10);
                doc.setFont(undefined, 'bold');
                doc.text(`Summary:`, 14, finalY);
                doc.setFont(undefined, 'normal');
                doc.text(`Present: ${presentMembers.length} (${Math.round((presentMembers.length / approvedMembers.length) * 100)}%)`, 14, finalY + 6);
                doc.text(`Absent: ${absentMembers.length} (${Math.round((absentMembers.length / approvedMembers.length) * 100)}%)`, 14, finalY + 12);
            }
        } else {
            // Summary report for multiple events
            const tableData = events.map(event => {
                const eventAttendance = attendance.filter(a => a.event_id === event.id);
                const attendanceCount = eventAttendance.length;
                const attendanceRate = approvedMembers.length > 0 ? 
                    Math.round((attendanceCount / approvedMembers.length) * 100) : 0;

                return [
                    event.title,
                    formatDate(event.event_date || event.date),
                    `${attendanceCount}/${approvedMembers.length}`,
                    `${attendanceRate}%`
                ];
            });

            // Add table
            doc.autoTable({
                startY: yPos,
                head: [['Event', 'Date', 'Attendance', 'Rate']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [0, 30, 60] },
                styles: { fontSize: 9 },
                columnStyles: {
                    0: { cellWidth: 80 },
                    1: { cellWidth: 40 },
                    2: { cellWidth: 35 },
                    3: { cellWidth: 25 }
                }
            });

            // Calculate overall statistics
            const totalAttendance = events.reduce((sum, event) => {
                return sum + attendance.filter(a => a.event_id === event.id).length;
            }, 0);
            const avgAttendance = events.length > 0 ? Math.round(totalAttendance / events.length) : 0;
            const avgRate = events.length > 0 && approvedMembers.length > 0 ? 
                Math.round((avgAttendance / approvedMembers.length) * 100) : 0;

            // Add summary
            const finalY = doc.lastAutoTable.finalY + 10;
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.text(`Overall Statistics:`, 14, finalY);
            doc.setFont(undefined, 'normal');
            doc.text(`Average Attendance: ${avgAttendance} members per event`, 14, finalY + 6);
            doc.text(`Average Attendance Rate: ${avgRate}%`, 14, finalY + 12);
        }

        // Add footer
        addReportFooter(doc);

        // Save PDF
        const filename = filters.eventId && filters.eventId !== 'all' ? 
            `Attendance_${events[0]?.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf` :
            `Attendance_Report_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(filename);
        
        return true;
    } catch (error) {
        console.error('Error generating attendance report:', error);
        alert('Error generating report. Please try again.');
        return false;
    }
}

// Generate Comprehensive Report
async function generateComprehensiveReport(filters = {}) {
    if (!initializeReportGeneration()) {
        alert('PDF library not loaded. Please refresh the page.');
        return;
    }

    try {
        // Fetch all data
        const membersResult = await window.supabaseDB.getMembers();
        const members = membersResult.success ? membersResult.data : [];

        const eventsResult = await window.supabaseDB.getEvents();
        const events = eventsResult.success ? eventsResult.data : [];

        const attendanceResult = await window.supabaseDB.getAttendance();
        const attendance = attendanceResult.success ? attendanceResult.data : [];

        const tasksResult = await window.supabaseDB.getTasks();
        const tasks = tasksResult.success ? tasksResult.data : [];

        const announcementsResult = await window.supabaseDB.getAnnouncements();
        const announcements = announcementsResult.success ? announcementsResult.data : [];

        // Apply date filters
        let filteredEvents = events;
        let filteredMembers = members;
        
        if (filters.startDate) {
            filteredEvents = filteredEvents.filter(e => 
                new Date(e.event_date || e.date) >= new Date(filters.startDate)
            );
            filteredMembers = filteredMembers.filter(m => 
                new Date(m.date_joined || m.created_at) >= new Date(filters.startDate)
            );
        }
        if (filters.endDate) {
            filteredEvents = filteredEvents.filter(e => 
                new Date(e.event_date || e.date) <= new Date(filters.endDate)
            );
            filteredMembers = filteredMembers.filter(m => 
                new Date(m.date_joined || m.created_at) <= new Date(filters.endDate)
            );
        }

        // Create PDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Add header
        addReportHeader(doc, 'Comprehensive Ministry Report');

        let yPos = 40;
        doc.setFontSize(10);
        doc.text(`Report Period: ${filters.startDate || 'All time'} to ${filters.endDate || 'Present'}`, 14, yPos);
        yPos += 10;

        // Section 1: Membership Overview
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('1. Membership Overview', 14, yPos);
        yPos += 8;
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');

        const approvedMembers = members.filter(m => m.status === 'approved');
        const activeMembers = approvedMembers.filter(m => m.active);
        const pendingMembers = members.filter(m => m.status === 'pending');

        doc.text(`Total Members: ${members.length}`, 20, yPos);
        yPos += 6;
        doc.text(`Approved Members: ${approvedMembers.length}`, 20, yPos);
        yPos += 6;
        doc.text(`Active Members: ${activeMembers.length}`, 20, yPos);
        yPos += 6;
        doc.text(`Pending Approvals: ${pendingMembers.length}`, 20, yPos);
        yPos += 6;
        doc.text(`New Members (Period): ${filteredMembers.length}`, 20, yPos);
        yPos += 10;

        // Section 2: Events Summary
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('2. Events Summary', 14, yPos);
        yPos += 8;
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');

        const upcomingEvents = events.filter(e => 
            new Date(e.event_date || e.date) >= new Date().setHours(0, 0, 0, 0)
        );
        const pastEvents = events.filter(e => 
            new Date(e.event_date || e.date) < new Date().setHours(0, 0, 0, 0)
        );

        doc.text(`Total Events: ${events.length}`, 20, yPos);
        yPos += 6;
        doc.text(`Upcoming Events: ${upcomingEvents.length}`, 20, yPos);
        yPos += 6;
        doc.text(`Past Events: ${pastEvents.length}`, 20, yPos);
        yPos += 6;
        doc.text(`Events (Period): ${filteredEvents.length}`, 20, yPos);
        yPos += 10;

        // Section 3: Attendance Statistics
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('3. Attendance Statistics', 14, yPos);
        yPos += 8;
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');

        const totalAttendance = pastEvents.reduce((sum, event) => {
            return sum + attendance.filter(a => a.event_id === event.id).length;
        }, 0);
        const avgAttendance = pastEvents.length > 0 ? Math.round(totalAttendance / pastEvents.length) : 0;
        const avgRate = pastEvents.length > 0 && activeMembers.length > 0 ? 
            Math.round((avgAttendance / activeMembers.length) * 100) : 0;

        doc.text(`Total Attendance Records: ${attendance.length}`, 20, yPos);
        yPos += 6;
        doc.text(`Average Attendance per Event: ${avgAttendance} members`, 20, yPos);
        yPos += 6;
        doc.text(`Average Attendance Rate: ${avgRate}%`, 20, yPos);
        yPos += 10;

        // Section 4: Tasks Overview
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('4. Tasks Overview', 14, yPos);
        yPos += 8;
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');

        const pendingTasks = tasks.filter(t => t.status === 'pending');
        const inProgressTasks = tasks.filter(t => t.status === 'in-progress');
        const completedTasks = tasks.filter(t => t.status === 'completed');

        doc.text(`Total Tasks: ${tasks.length}`, 20, yPos);
        yPos += 6;
        doc.text(`Pending: ${pendingTasks.length}`, 20, yPos);
        yPos += 6;
        doc.text(`In Progress: ${inProgressTasks.length}`, 20, yPos);
        yPos += 6;
        doc.text(`Completed: ${completedTasks.length}`, 20, yPos);
        yPos += 10;

        // Section 5: Announcements
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('5. Announcements', 14, yPos);
        yPos += 8;
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');

        const activeAnnouncements = announcements.filter(a => a.active);
        const urgentAnnouncements = announcements.filter(a => a.priority === 'urgent');

        doc.text(`Total Announcements: ${announcements.length}`, 20, yPos);
        yPos += 6;
        doc.text(`Active Announcements: ${activeAnnouncements.length}`, 20, yPos);
        yPos += 6;
        doc.text(`Urgent Announcements: ${urgentAnnouncements.length}`, 20, yPos);

        // Add footer
        addReportFooter(doc);

        // Save PDF
        doc.save(`Comprehensive_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        
        return true;
    } catch (error) {
        console.error('Error generating comprehensive report:', error);
        alert('Error generating report. Please try again.');
        return false;
    }
}

// Helper function to add report header
function addReportHeader(doc, title) {
    // Add logo/church name
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Church of Pentecost Youth Ministry', 14, 15);
    
    // Add report title
    doc.setFontSize(14);
    doc.text(title, 14, 25);
    
    // Add generation date
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 32);
    
    // Add line
    doc.setLineWidth(0.5);
    doc.line(14, 35, 196, 35);
}

// Helper function to add report footer
function addReportFooter(doc) {
    const pageCount = doc.internal.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont(undefined, 'italic');
        doc.text(
            `Page ${i} of ${pageCount}`,
            doc.internal.pageSize.getWidth() / 2,
            doc.internal.pageSize.getHeight() - 10,
            { align: 'center' }
        );
        doc.text(
            'Church Youth Management System',
            14,
            doc.internal.pageSize.getHeight() - 10
        );
    }
}

// Helper function to format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Export functions
window.reportGenerator = {
    generateMembersReport,
    generateEventsReport,
    generateAttendanceReport,
    generateComprehensiveReport
};
