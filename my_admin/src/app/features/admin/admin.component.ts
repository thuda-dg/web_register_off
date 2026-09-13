import {
  Component,
  inject,
  OnInit,
  signal
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  Router
} from '@angular/router';

import {
  finalize
} from 'rxjs';

import {
  EmployeeItem
} from '../../core/models/admin.model';

import {
  AuthService
} from '../../core/services/auth.services';

import {
  AdminService
} from '../../core/services/admin.services';


@Component({
  selector: 'app-admin',
  standalone: true,

  imports: [
    CommonModule
  ],

  template: `
  <section
    class="min-h-screen bg-slate-100 text-slate-800"
  >

    <!-- HEADER -->
    <header
      class="border-b border-slate-200 bg-white shadow-sm"
    >
      <div
        class="mx-auto flex max-w-7xl items-center justify-between px-6 py-4"
      >

        <div>
          <h1
            class="text-2xl font-bold text-emerald-700"
          >
            Quản lý nhân viên
          </h1>

          <p
            class="mt-1 text-sm text-slate-500"
          >
            Quản lý thông tin, team và role của nhân viên
          </p>
        </div>


        <button
          type="button"
          (click)="logout()"
          [disabled]="logoutLoading()"
          class="rounded-lg bg-red-600 px-4 py-2
                 font-semibold text-white
                 transition hover:bg-red-700
                 disabled:cursor-not-allowed
                 disabled:opacity-60"
        >
          {{
            logoutLoading()
              ? 'Đang đăng xuất...'
              : 'Đăng xuất'
          }}
        </button>

      </div>
    </header>


    <!-- CONTENT -->
    <main
      class="mx-auto max-w-7xl px-6 py-8"
    >

      <!-- TITLE -->
      <div
        class="mb-6 flex items-center justify-between"
      >

        <div>
          <h2
            class="text-xl font-semibold"
          >
            Danh sách nhân viên
          </h2>

          <p
            class="mt-1 text-sm text-slate-500"
          >
            Tổng số:
            {{ employees().length }}
            nhân viên
          </p>
        </div>

      </div>


      <!-- TABLE -->
      <div
        class="overflow-hidden rounded-2xl
               border border-slate-200
               bg-white shadow-sm"
      >

        <div
          class="overflow-x-auto"
        >

          <table
            class="min-w-full divide-y divide-slate-200"
          >

            <thead
              class="bg-slate-50"
            >

              <tr>

                <th
                  class="px-6 py-3 text-left
                         text-xs font-semibold
                         uppercase tracking-wider
                         text-slate-500"
                >
                  #
                </th>

                <th
                  class="px-6 py-3 text-left
                         text-xs font-semibold
                         uppercase tracking-wider
                         text-slate-500"
                >
                  Họ tên
                </th>

                <th
                  class="px-6 py-3 text-left
                         text-xs font-semibold
                         uppercase tracking-wider
                         text-slate-500"
                >
                  Team
                </th>

                <th
                  class="px-6 py-3 text-left
                         text-xs font-semibold
                         uppercase tracking-wider
                         text-slate-500"
                >
                  Role
                </th>

                <th
                  class="px-6 py-3 text-right
                         text-xs font-semibold
                         uppercase tracking-wider
                         text-slate-500"
                >
                  Thao tác
                </th>

              </tr>

            </thead>


            <tbody
              class="divide-y divide-slate-100 bg-white"
            >

              @for (
                employee of employees();
                track employee.id;
                let index = $index
              ) {

                <tr
                  class="transition hover:bg-slate-50"
                >

                  <!-- STT -->
                  <td
                    class="whitespace-nowrap px-6 py-4
                           text-sm text-slate-500"
                  >
                    {{ index + 1 }}
                  </td>


                  <!-- FULL NAME -->
                  <td
                    class="whitespace-nowrap px-6 py-4"
                  >
                    <div
                      class="font-semibold text-slate-800"
                    >
                      {{ employee.fullName }}
                    </div>
                  </td>


                  <!-- TEAM -->
                  <td
                    class="whitespace-nowrap px-6 py-4"
                  >

                    @if (employee.teamName) {

                      <span
                        class="inline-flex rounded-full
                               bg-blue-50 px-3 py-1
                               text-sm font-medium
                               text-blue-700"
                      >
                        {{ employee.teamName }}
                      </span>

                    } @else {

                      <span
                        class="text-sm text-slate-400"
                      >
                        Chưa có team
                      </span>

                    }

                  </td>


                  <!-- ROLES -->
                  <td
                    class="px-6 py-4"
                  >

                    @if (employee.roles.length > 0) {

                      <div
                        class="flex flex-wrap gap-2"
                      >

                        @for (
                          role of employee.roles;
                          track role.id
                        ) {

                          <span
                            class="inline-flex rounded-full
                                   bg-emerald-50 px-3 py-1
                                   text-sm font-medium
                                   text-emerald-700"
                          >
                            {{ role.name }}
                          </span>

                        }

                      </div>

                    } @else {

                      <span
                        class="text-sm text-slate-400"
                      >
                        Chưa có role
                      </span>

                    }

                  </td>


                  <!-- ACTION -->
                  <td
                    class="whitespace-nowrap px-6 py-4 text-right"
                  >

                    <button
                      type="button"
                      (click)="editEmployee(employee)"
                      class="rounded-lg border
                             border-emerald-600
                             px-4 py-2
                             text-sm font-semibold
                             text-emerald-700
                             transition
                             hover:bg-emerald-50"
                    >
                      Edit
                    </button>

                  </td>

                </tr>

              }
              @empty {

                <tr>

                  <td
                    colspan="5"
                    class="px-6 py-10 text-center
                           text-sm text-slate-500"
                  >
                    Không có nhân viên nào.
                  </td>

                </tr>

              }

            </tbody>

          </table>

        </div>

      </div>

    </main>

  </section>
`
})
export class AdminComponent
  implements OnInit {

  private readonly authService =
    inject(AuthService);

  private readonly router =
    inject(Router);

  private readonly adminService =
    inject(AdminService);


  readonly logoutLoading =
    signal(false);


  /*
   * Đây mới là Signal chứa danh sách nhân viên.
   */
  readonly employees =
    signal<EmployeeItem[]>([]);


  ngOnInit(): void {

    this.loadEmployees();

  }


  private loadEmployees(): void {

    this.adminService
      .getAll()
      .subscribe({

        next: (response) => {

          this.employees.set(
            response.items
          );

        },

        error: (error) => {

          console.error(
            'Load employees failed:',
            error
          );

        }

      });

  }


  editEmployee(
    employee: EmployeeItem
  ): void {

    console.log(
      'Edit employee:',
      employee
    );

    this.router.navigate([
      '/admin/employees',
      employee.id,
      'edit'
    ]);

  }


  logout(): void {

    if (
      this.logoutLoading()
    ) {
      return;
    }

    this.logoutLoading.set(true);

    this.authService
      .logout()
      .pipe(
        finalize(() => {

          this.logoutLoading.set(false);

        })
      )
      .subscribe({

        next: () => {},

        error: (error) => {

          console.error(
            'Logout error:',
            error
          );

        }

      });

  }

}