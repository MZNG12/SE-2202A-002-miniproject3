// Assignment Class
class Assignment {
    #grade;
    
    constructor(assignmentName) {
        this.assignmentName = assignmentName;
        this.status = 'released'; // initial status when assignment is released
    }
    
    setGrade(grade) {
        this.#grade = grade;
        this.status = grade > 50 ? 'pass' : 'fail';
    }
    
    getGrade() {
        return this.#grade;
    }
}

// Observer Class
class Observer {
    notify(studentName, assignmentName, status) {
        console.log(`Observer → ${studentName}, ${assignmentName} ${status}`);
    }
}

// Student Class
class Student {
    constructor(fullName, email, observer) {
        this.fullName = fullName;
        this.email = email;
        this.observer = observer;
        this.assignmentStatuses = []; // array of Assignment objects
        this.overallGrade = 0;
        this.workingTimeouts = new Map(); // to track working timeouts
    }
    
    setFullName(fullName) {
        this.fullName = fullName;
    }
    
    setEmail(email) {
        this.email = email;
    }
    
    updateAssignmentStatus(assignmentName, grade = null) {
        let assignment = this.assignmentStatuses.find(a => a.assignmentName === assignmentName);
        
        if (!assignment) {
            // Create new assignment if it doesn't exist
            assignment = new Assignment(assignmentName);
            this.assignmentStatuses.push(assignment);
            this.observer.notify(this.fullName, assignmentName, 'has been released');
        }
        
        if (grade !== null) {
            assignment.setGrade(grade);
            this.observer.notify(this.fullName, assignmentName, `has ${assignment.status}ed`);
        }
        
        this.#calculateOverallGrade();
    }
    
    getAssignmentStatus(assignmentName) {
        const assignment = this.assignmentStatuses.find(a => a.assignmentName === assignmentName);
        
        if (!assignment) {
            return "Hasn't been assigned";
        }
        
        if (assignment.status === 'pass' || assignment.status === 'fail') {
            return assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1);
        }
        
        return assignment.status;
    }
    
    async startWorking(assignmentName) {
        // Clear any existing timeout for this assignment
        if (this.workingTimeouts.has(assignmentName)) {
            clearTimeout(this.workingTimeouts.get(assignmentName));
        }
        
        // Update status to working
        let assignment = this.assignmentStatuses.find(a => a.assignmentName === assignmentName);
        if (assignment) {
            assignment.status = 'working';
            this.observer.notify(this.fullName, assignmentName, 'is working on');
        } else {
            // If assignment doesn't exist, create it first
            this.updateAssignmentStatus(assignmentName);
            assignment = this.assignmentStatuses.find(a => a.assignmentName === assignmentName);
            assignment.status = 'working';
            this.observer.notify(this.fullName, assignmentName, 'is working on');
        }
        
        // Set timeout to submit after 500ms if not interrupted by reminder
        const timeoutId = setTimeout(() => {
            this.submitAssignment(assignmentName);
        }, 500);
        
        this.workingTimeouts.set(assignmentName, timeoutId);
    }
    
    submitAssignment(assignmentName) {
        const assignment = this.assignmentStatuses.find(a => a.assignmentName === assignmentName);
        if (assignment && assignment.status !== 'submitted') {
            assignment.status = 'submitted';
            this.observer.notify(this.fullName, assignmentName, 'has submitted');
            
            // Simulate grading after 500ms
            setTimeout(() => {
                const randomGrade = Math.floor(Math.random() * 101); // 0-100
                this.updateAssignmentStatus(assignmentName, randomGrade);
            }, 500);
        }
        
        // Clear the working timeout
        if (this.workingTimeouts.has(assignmentName)) {
            clearTimeout(this.workingTimeouts.get(assignmentName));
            this.workingTimeouts.delete(assignmentName);
        }
    }
    
    getGrade() {
        return this.overallGrade;
    }
    
    #calculateOverallGrade() {
        const gradedAssignments = this.assignmentStatuses.filter(a => 
            a.status === 'pass' || a.status === 'fail'
        );
        
        if (gradedAssignments.length === 0) {
            this.overallGrade = 0;
            return;
        }
        
        const total = gradedAssignments.reduce((sum, assignment) => 
            sum + assignment.getGrade(), 0
        );
        this.overallGrade = total / gradedAssignments.length;
    }
    
    // Method to handle reminders - submit assignment immediately
    handleReminder(assignmentName) {
        if (this.workingTimeouts.has(assignmentName)) {
            // If student is working, submit immediately
            clearTimeout(this.workingTimeouts.get(assignmentName));
            this.workingTimeouts.delete(assignmentName);
        }
        
        const assignment = this.assignmentStatuses.find(a => a.assignmentName === assignmentName);
        if (assignment && assignment.status !== 'submitted' && 
            assignment.status !== 'pass' && assignment.status !== 'fail') {
            assignment.status = 'final reminder';
            this.observer.notify(this.fullName, assignmentName, 'has received a final reminder for');
            this.submitAssignment(assignmentName);
        }
    }
}

// Classlist management
class ClassList {
    constructor(observer) {
        this.students = [];
        this.observer = observer;
    }
    
    addStudent(student) {
        this.students.push(student);
        console.log(`${student.fullName} has been added to the classlist.`);
    }
    
    removeStudent(studentName) {
        const index = this.students.findIndex(s => s.fullName === studentName);
        if (index !== -1) {
            this.students.splice(index, 1);
        }
    }
    
    findStudentByName(fullName) {
        return this.students.find(s => s.fullName === fullName);
    }
    
    findOutstandingAssignments(assignmentName = null) {
        if (assignmentName) {
            // Find students who haven't submitted a specific assignment
            return this.students
                .filter(student => {
                    const assignment = student.assignmentStatuses.find(a => a.assignmentName === assignmentName);
                    return assignment && 
                           assignment.status !== 'submitted' && 
                           assignment.status !== 'pass' && 
                           assignment.status !== 'fail';
                })
                .map(student => student.fullName);
        } else {
            // Find students with any released but not submitted assignments
            return this.students
                .filter(student => 
                    student.assignmentStatuses.some(a => 
                        a.status === 'released' || a.status === 'working'
                    )
                )
                .map(student => student.fullName);
        }
    }
    
    // Parallel assignment release
    async releaseAssignmentsParallel(assignmentNames) {
        const releasePromises = this.students.map(student => {
            return Promise.all(
                assignmentNames.map(assignmentName => 
                    new Promise(resolve => {
                        student.updateAssignmentStatus(assignmentName);
                        resolve();
                    })
                )
            );
        });
        
        return Promise.all(releasePromises);
    }
    
    // Send reminders for an assignment
    sendReminder(assignmentName) {
        const outstandingStudents = this.findOutstandingAssignments(assignmentName);
        outstandingStudents.forEach(studentName => {
            const student = this.findStudentByName(studentName);
            if (student) {
                student.handleReminder(assignmentName);
            }
        });
    }
}

// === Example Usage ===
const observer = new Observer();
const classList = new ClassList(observer);

const s1 = new Student("Alice Smith", "alice@example.com", observer);
const s2 = new Student("Bob Jones", "bob@example.com", observer);

classList.addStudent(s1);
classList.addStudent(s2);

// Example test case
classList.releaseAssignmentsParallel(["A1", "A2"]).then(() => {
  s1.startWorking("A1");
  s2.startWorking("A2");

  setTimeout(() => classList.sendReminder("A1"), 200);
});

// Additional test to see the final results
setTimeout(() => {
    console.log('\n--- Final Results ---');
    console.log(`Alice's overall grade: ${s1.getGrade()}`);
    console.log(`Bob's overall grade: ${s2.getGrade()}`);
    console.log(`Alice's A1 status: ${s1.getAssignmentStatus("A1")}`);
    console.log(`Bob's A2 status: ${s2.getAssignmentStatus("A2")}`);
}, 2000);