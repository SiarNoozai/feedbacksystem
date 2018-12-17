import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {CourseTableItem} from "../modules/student/student-list/course-table/course-table-datasource";
import {Observable} from "rxjs";

/**
 *  Service to communicate with db.
 *  Get submission result or submit for a given Task.
 *  Subscribe and unsubscribe a course. Check results
 *  for courses and more.
 */
@Injectable({
  providedIn: 'root'
})
export class DatabaseService {


  constructor(private http: HttpClient) {
  }

  // Courses

  /**
   * Returns all courses an user subscribed to
   */
  getCourses(): Observable<CourseTableItem[]> {
    return this.http.get<CourseTableItem[]>('/api/v1/courses');
  }

  /**
   * Create a new Course
   * @param name of the course
   * @param description of the course
   * @param standard_task_typ
   */
  createCourse(name: string, description: string, standard_task_typ: number) {
    return this.http.post('/api/v1/courses', {
      name: name,
      description: description,
      standard_task_typ: standard_task_typ
    });
  }

  /**
   * Delete a course
   * @param id of course which will be deleted
   */
  deleteCourse(id: number) {
    return this.http.delete('/api/v1/courses/' + id);
  }

  /**
   * Update a course
   * @param id of course which should be updated
   * @param name of updated course
   * @param description of updated couse
   * @param standard_task_typ
   */
  updateCourse(id: number, name: string, description: string, standard_task_typ: number) {
    return this.http.put('/api/v1/courses/' + id, {
      name: name,
      description: description,
      standard_task_typ: standard_task_typ
    });
  }

  /**
   * Return all task for course
   * with given id
   * @param id of course to obtain task from
   */
  getCourseDetail(id: number): Observable<CourseDetail> {
    return this.http.get<CourseDetail>('/api/v1/courses/' + id);
  }

  /**
   * Returns all courses
   */
  getAllCourses(): Observable<CourseTableItem[]> {
    return this.http.get<CourseTableItem[]>('/api/v1/courses/all');
  }

  /**
   * User subscription to course with :id
   * @param id of course to subscribe
   */
  subscribeCourse(id: number) {
    return this.http.post('/api/v1/courses/' + id + '/subscribe', {});
  }

  /**
   * User unsub course with :id
   * @param id of course to unsub
   */
  unsubscribeCourse(id: number) {
    return this.http.post('/api/v1/courses/' + id + '/unsubscribe', {});
  }

  /**
   * Grant a user edit rights in course
   * @param id of course
   * @param username of user that should become edit rights
   */
  grantUserEdit(id: number, username: string) {
    return this.http.post('/api/v1/courses/' + id + '/grant', {username: username, grant_type: 'edit'});
  }

  /**
   * Returns all submissions an user
   * has made in course with :id
   * @param id of course to obtain all submissions
   */
  allUserSubmissions(id: number) {
    return this.http.get('/api/v1/courses/' + id + '/submissions');
  }


  // Tasks

  /**
   * Create a new task
   * @param idCourse course in with task should be created
   * @param name of task
   * @param description of task
   * @param filename
   * @param test_type
   */
  createTask(idCourse: number, name: string, description: string, filename: string, test_type: number) {
    return this.http.post('/api/v1/courses/' + idCourse + '/tasks', {
      name: name,
      description: description,
      filename: filename,
      test_type: test_type
    });
  }

  /**
   * Update a task
   * @param idCourse of course
   * @param idTask of task that will be updated
   * @param name of updated task
   * @param description of updated task
   * @param filename
   * @param test_type
   */
  updateTask(idCourse: number, idTask: number, name: string, description: string, filename: string, test_type: number) {
    return this.http.put('/api/v1/courses/' + idCourse + '/tasks/' + idTask, {
      name: name,
      description: description,
      filename: filename,
      test_type: test_type
    });
  }

  /**
   * Delete task
   * @param idCourse of course where task should be deleted
   * @param idTask of task that should be deleted
   */
  deleteTask(idCourse: number, idTask: number) {
    return this.http.delete('/api/v1/courses/' + idCourse + '/tasks/' + idTask);
  }

  /**
   * Return details of task
   * @param idCourse of course where the task is
   * @param idTask of task from which details will be obtained
   */
  getTaskDetail(idCourse: number, idTask: number) {
    return this.http.get('/api/v1/courses/' + idCourse + '/tasks/' + idTask);
  }

  /**
   * Returns task result
   * @param idCourse of course where task is
   * @param idTask of task
   */
  getTaskResult(idCourse: number, idTask: number) {
    return this.http.get('/api/v1/courses/' + idCourse + '/tasks/' + idTask + '/result');
  }

  /**
   * User submits task as file or string
   * @param idTask of task that will be submitted
   * @param data that the user submits
   */
  submitTask(idTask: number, data: File | string) {
    if (data instanceof File) { // Data is file
      let upload_url: string;
      // File in form data
      let formDataFile = new FormData();
      formDataFile.append("file", data, data.name);

      // Ask for upload route and save it in upload_url
      this.http.post<SubmitResult>('/api/v1/tasks/' + idTask + '/submit', {}).subscribe(res => {
        upload_url = res.upload_url;
      }, err => {
        console.log(err);
      }, () => {

        // Send form file to upload route
        this.http.post(upload_url, formDataFile, {
          headers: {'Authorization': 'Bearer ' + localStorage.getItem('user')}
        }).subscribe();
      });
    } else { // Data is string
      this.http.post<SubmitResult>('/api/v1/tasks/' + idTask + '/submit', {data: data}).subscribe(res => {
        return res.success;
      });
    }
  }


  /**
   * Returns all submissions an user
   * did for a given task
   * @param idCourse of course
   * @param idTask of task where all submissions will be returned
   */
  getTaskSubmissions(idCourse: number, idTask: number) {
    return this.http.get('/api/v1/courses/' + idCourse + '/tasks/' + idTask + '/submissions');
  }

  getOverview(): Observable<DashboardInformation[]> {
    return this.http.get<DashboardInformation[]>("/api/v1/courses/submissions");
  }

}


export interface CourseDetail {
  course_id: number;
  course_name: string;
  course_description: string;
  tasks: Task[];
}

export interface Task {
  course_id: number;
  task_description: string;
  task_id: number;
  task_name: string;
}

export interface SubmitResult {
  success: boolean;
  taskid: number;
  submissionid: number;
  upload_url: string;
}

export interface DashboardInformation {
  course_description: string;
  submit_date: Date;
  result?: string;
  task_name: string;
  passed: number;
  result_date?: Date;
  course_name: string;
  message?: string;
  course_id: number;
  task_id: number;
  task_description: string;
  submission_id: number;
}

