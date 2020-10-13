import {Component, OnInit} from '@angular/core';
import {FormControl} from '@angular/forms';
import {flatMap, startWith} from 'rxjs/operators';
import {Observable, of} from 'rxjs';
import {Router} from '@angular/router';
import {TitlebarService} from '../../service/titlebar.service';
import {CourseService} from "../../service/course.service";
import {Course} from "../../model/Course";
import {Roles} from "../../model/Roles";
import {AuthService} from "../../service/auth.service";
import {NewticketDialogComponent} from "../../dialogs/newticket-dialog/newticket-dialog.component";
import {CourseUpdateDialogComponent} from "../../dialogs/course-update-dialog/course-update-dialog.component";
import {MatDialog} from "@angular/material/dialog";

/**
 * Show all courses
 */
@Component({
  selector: 'app-search-courses',
  templateUrl: './search-courses.component.html',
  styleUrls: ['./search-courses.component.scss']
})
export class SearchCoursesComponent implements OnInit {
  constructor(private courseService: CourseService,
              private router: Router,
              private auth: AuthService,
              private dialog: MatDialog,
              private titlebar: TitlebarService) {
  }

  courses: Observable<Course[]> = of();
  filteredCourses: Observable<Course[]> = of();
  control: FormControl = new FormControl();

  ngOnInit() {
    this.titlebar.emitTitle('Kurs suchen');
    this.courses = this.courseService.getCourseList()

    this.filteredCourses = this.control.valueChanges.pipe(
      startWith(''),
      flatMap(value => this._filter(value))
    );
  }

  createCourse() {
    this.dialog.open(CourseUpdateDialogComponent, {
      height: 'auto',
      width: 'auto',
      data: {isUpdateDialog: false}
    }).afterClosed().subscribe(result => {
      if (result.success) {
        setTimeout( () => {this.router.navigate(['/courses', result.course.id]); }, 100);
      }
    }, error => console.error(error));
  }

  public isAuthorized() {
    const globalRole = this.auth.getToken().globalRole
    return Roles.GlobalRole.isAdmin(globalRole) || Roles.GlobalRole.isModerator(globalRole)
  }

  /**
   * Navigates to subbed course
   * @param courseId The course to go to
   */
  goToCourse(courseId: number) {
    this.router.navigate(['courses', courseId]);
  }

  private _filter(value: string): Observable<Course[]> {
    const filterValue = this._normalizeValue(value);
    return this.courses.pipe(
      flatMap(courseList => {
        if (filterValue.length > 0) {
          return of(courseList.filter(course => this._normalizeValue(course.name).includes(filterValue)))
        } else {
          return this.courses
        }
      })
    )
  }

  private _normalizeValue(value: string): string {
    return value.toLowerCase().replace(/\s/g, '');
  }
}
