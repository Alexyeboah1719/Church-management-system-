// DEPRECATED: This file is kept for legacy reference only.
// Real-time reports now use window.reportGenerator in report-generator.js.
// Additional Report Generation Functions for Admin Dashboard

// Aggregate report data from localStorage
function aggregateReportData(startDate, endDate) {
    const members = JSON.parse(localStorage.getItem('members') || '[]');
    const attendance = JSON.parse(localStorage.getItem('attendance') || '[]');
    const events = JSON.parse(localStorage.getItem('events') || '[]');
    const announcements = JSON.parse(localStorage.getItem('announcements') || '[]');
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Filter data by date range
    const filteredMembers = members.filter(m => {
        const joinDate = new Date(m.dateJoined);
        return joinDate >= start && joinDate <= end;
    });

    const filteredAttendance = attendance.filter(a => {
        const attendanceDate = new Date(a.date);
        return attendanceDate >= start && attendanceDate <= end;
    });

    const filteredEvents = events.filter(e => {
        const eventDate = new Date(e.date);
        return eventDate >= start && eventDate <= end;
    });

    const filteredAnnouncements = announcements.filter(a => {
        const announcementDate = new Date(a.date);
        return announcementDate >= start && announcementDate <= end;
    });

    const filteredTasks = tasks.filter(t => {
        const taskDate = new Date(t.dueDate || t.createdAt);
        return taskDate >= start && taskDate <= end;
    });

    // Calculate statistics
    const totalMembers = members.length;
    const activeMembers = members.filter(m => m.active && m.status === 'approved').length;
    const newMembers = filteredMembers.length;
    const deactivatedMembers = members.filter(m => {
        if (!m.lastActive) return false;
        const lastActiveDate = new Date(m.lastActive);
        return lastActiveDate >= start && lastActiveDate <= end && !m.active;
    }).length;

    const totalAttendanceRecords = filteredAttendance.length;
    const uniqueAttendanceMembers = new Set(filteredAttendance.map(a => a.memberId)).size;
    const attendanceRate = totalMembers > 0 ? (uniqueAttendanceMembers / totalMembers * 100).toFixed(1) : 0;

    const completedTasks = filteredTasks.filter(t => t.status === 'completed').length;
    const pendingTasks = filteredTasks.filter(t => t.status === 'pending').length;

    // Growth calculations
    const previousPeriodStart = new Date(start);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - (end - start > 7 * 24 * 60 * 60 * 1000 ? 30 : 7));
    const previousPeriodEnd = new Date(start);
    previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 1);

    const previousPeriodMembers = members.filter(m => {
        const joinDate = new Date(m.dateJoined);
        return joinDate >= previousPeriodStart && joinDate <= previousPeriodEnd;
    }).length;

    const memberGrowthRate = previousPeriodMembers > 0 ?
        ((newMembers - previousPeriodMembers) / previousPeriodMembers * 100).toFixed(1) :
        (newMembers > 0 ? 100 : 0);

    return {
        period: { start, end, type: end - start > 7 * 24 * 60 * 60 * 1000 ? 'monthly' : 'weekly' },
        members: {
            total: totalMembers,
            active: activeMembers,
            new: newMembers,
            deactivated: deactivatedMembers,
            growthRate: parseFloat(memberGrowthRate)
        },
        attendance: {
            totalRecords: totalAttendanceRecords,
            uniqueMembers: uniqueAttendanceMembers,
            rate: parseFloat(attendanceRate),
            records: filteredAttendance
        },
        events: {
            total: filteredEvents.length,
            upcoming: filteredEvents.filter(e => new Date(e.date) > new Date()).length,
            completed: filteredEvents.filter(e => new Date(e.date) <= new Date()).length,
            list: filteredEvents
        },
        announcements: {
            total: filteredAnnouncements.length,
            list: filteredAnnouncements
        },
        tasks: {
            total: filteredTasks.length,
            completed: completedTasks,
            pending: pendingTasks,
            completionRate: filteredTasks.length > 0 ?
                (completedTasks / filteredTasks.length * 100).toFixed(1) : 0
        },
        allMembers: members,
        newMembersList: filteredMembers,
        deactivatedMembersList: members.filter(m => {
            if (!m.lastActive) return false;
            const lastActiveDate = new Date(m.lastActive);
            return lastActiveDate >= start && lastActiveDate <= end && !m.active;
        })
    };
}

// Add Executive Summary to PDF
function addExecutiveSummary(doc, data, yPosition) {
    doc.setFontSize(14);
    doc.text('Executive Summary', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    const summary = [
        `Total Members: ${data.members.total} (${data.members.active} active)`,
        `New Members: ${data.members.new}`,
        `Member Growth Rate: ${data.members.growthRate > 0 ? '+' : ''}${data.members.growthRate}%`,
        `Attendance Rate: ${data.attendance.rate}%`,
        `Events Held: ${data.events.completed}`,
        `Task Completion Rate: ${data.tasks.completionRate}%`
    ];

    summary.forEach(line => {
        doc.text(line, 20, yPosition);
        yPosition += 6;
    });

    yPosition += 5;
    return yPosition;
}

// Add Member Statistics to PDF
function addMemberStatistics(doc, data, yPosition) {
    if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
    }

    doc.setFontSize(14);
    doc.text('Member Statistics', 20, yPosition);
    yPosition += 10;

    // Create table for member statistics
    const memberStats = [
        ['Metric', 'Count', 'Percentage'],
        ['Total Members', data.members.total.toString(), '100%'],
        ['Active Members', data.members.active.toString(),
            data.members.total > 0 ? `${(data.members.active / data.members.total * 100).toFixed(1)}%` : '0%'],
        ['New Members', data.members.new.toString(),
            data.members.total > 0 ? `${(data.members.new / data.members.total * 100).toFixed(1)}%` : '0%'],
        ['Deactivated Members', data.members.deactivated.toString(),
            data.members.total > 0 ? `${(data.members.deactivated / data.members.total * 100).toFixed(1)}%` : '0%']
    ];

    doc.autoTable({
        head: [memberStats[0]],
        body: memberStats.slice(1),
        startY: yPosition,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [66, 139, 202] }
    });

    yPosition = doc.lastAutoTable.finalY + 10;
    return yPosition;
}

// Add Attendance Statistics to PDF
function addAttendanceStatistics(doc, data, yPosition) {
    if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
    }

    doc.setFontSize(14);
    doc.text('Attendance Statistics', 20, yPosition);
    yPosition += 10;

    const attendanceStats = [
        ['Metric', 'Count', 'Rate'],
        ['Total Attendance Records', data.attendance.totalRecords.toString(), '-'],
        ['Unique Members Attended', data.attendance.uniqueMembers.toString(),
            data.members.total > 0 ? `${data.attendance.rate}%` : '0%'],
        ['Average Attendance per Event',
            data.events.completed > 0 ? Math.round(data.attendance.totalRecords / data.events.completed).toString() : '0', '-']
    ];

    doc.autoTable({
        head: [attendanceStats[0]],
        body: attendanceStats.slice(1),
        startY: yPosition,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [76, 175, 80] }
    });

    yPosition = doc.lastAutoTable.finalY + 10;
    return yPosition;
}

// Add Events and Announcements to PDF
function addEventsAndAnnouncements(doc, data, yPosition) {
    if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
    }

    doc.setFontSize(14);
    doc.text('Events and Announcements', 20, yPosition);
    yPosition += 10;

    // Events table
    doc.setFontSize(12);
    doc.text(`Events (${data.events.total})`, 20, yPosition);
    yPosition += 7;

    if (data.events.list.length > 0) {
        const eventsTable = [
            ['Event Title', 'Date', 'Status'],
            ...data.events.list.map(event => [
                event.title,
                formatDate(event.date),
                new Date(event.date) > new Date() ? 'Upcoming' : 'Completed'
            ])
        ];

        doc.autoTable({
            head: [eventsTable[0]],
            body: eventsTable.slice(1),
            startY: yPosition,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [255, 152, 0] }
        });

        yPosition = doc.lastAutoTable.finalY + 10;
    } else {
        doc.setFontSize(10);
        doc.text('No events in this period', 20, yPosition);
        yPosition += 10;
    }

    // Announcements
    doc.setFontSize(12);
    doc.text(`Announcements (${data.announcements.total})`, 20, yPosition);
    yPosition += 7;

    if (data.announcements.list.length > 0) {
        const announcementsTable = [
            ['Title', 'Date', 'Priority'],
            ...data.announcements.list.map(announcement => [
                announcement.title,
                formatDate(announcement.date),
                announcement.priority || 'Normal'
            ])
        ];

        doc.autoTable({
            head: [announcementsTable[0]],
            body: announcementsTable.slice(1),
            startY: yPosition,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [156, 39, 176] }
        });

        yPosition = doc.lastAutoTable.finalY + 10;
    } else {
        doc.setFontSize(10);
        doc.text('No announcements in this period', 20, yPosition);
        yPosition += 10;
    }

    return yPosition;
}

// Add Detailed Member Lists to PDF
function addDetailedMemberLists(doc, data, yPosition) {
    if (yPosition > 230) {
        doc.addPage();
        yPosition = 20;
    }

    // New Members
    if (data.newMembersList.length > 0) {
        doc.setFontSize(14);
        doc.text('New Members', 20, yPosition);
        yPosition += 10;

        const newMembersTable = [
            ['Name', 'Email', 'Phone', 'Join Date'],
            ...data.newMembersList.map(member => [
                member.name,
                member.email,
                member.phone,
                formatDate(member.dateJoined)
            ])
        ];

        doc.autoTable({
            head: [newMembersTable[0]],
            body: newMembersTable.slice(1),
            startY: yPosition,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [0, 150, 136] }
        });

        yPosition = doc.lastAutoTable.finalY + 10;
    }

    // Deactivated Members
    if (data.deactivatedMembersList.length > 0) {
        if (yPosition > 230) {
            doc.addPage();
            yPosition = 20;
        }

        doc.setFontSize(14);
        doc.text('Deactivated Members', 20, yPosition);
        yPosition += 10;

        const deactivatedMembersTable = [
            ['Name', 'Email', 'Phone', 'Deactivation Date'],
            ...data.deactivatedMembersList.map(member => [
                member.name,
                member.email,
                member.phone,
                formatDate(member.lastActive)
            ])
        ];

        doc.autoTable({
            head: [deactivatedMembersTable[0]],
            body: deactivatedMembersTable.slice(1),
            startY: yPosition,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [244, 67, 54] }
        });
    }

    return yPosition;
}

// Helper function to format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}
