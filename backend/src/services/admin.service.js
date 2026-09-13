const {
  Op
} = require('sequelize');

const {
  Employee,
  UserAccount,
  Role,
  Team,
  EmpTeamHistory
} = require('../models');


async function getAllEmployees() {

  const today =
    new Date()
      .toISOString()
      .slice(0, 10);

  const employees =
    await Employee.findAll({

      /*
       * Chỉ lấy employee đang active.
       * Nếu bạn muốn lấy cả inactive
       * thì bỏ đoạn where này.
       */
      where: {
        is_active: true
      },

      attributes: [
        'emp_id',
        'emp_code',
        'emp_name',
        'emp_email'
      ],

      include: [

        // ============================================
        // CURRENT TEAM
        // ============================================

        {
          model: EmpTeamHistory,
          as: 'teamHistories',

          attributes: [
            'emp_team_history_id',
            'team_id',
            'start_date',
            'end_date'
          ],

          /*
           * Team hiện tại:
           *
           * start_date <= hôm nay
           *
           * và
           *
           * end_date = null
           * hoặc
           * end_date >= hôm nay
           */
          where: {

            start_date: {
              [Op.lte]: today
            },

            [Op.or]: [
              {
                end_date: null
              },
              {
                end_date: {
                  [Op.gte]: today
                }
              }
            ]

          },

          /*
           * required false = LEFT JOIN
           *
           * Employee chưa có team
           * vẫn được trả ra.
           */
          required: false,

          include: [
            {
              model: Team,
              as: 'team',

              attributes: [
                'team_id',
                'team_name'
              ],

              required: false
            }
          ]
        },


        // ============================================
        // USER ACCOUNT + CURRENT ROLES
        // ============================================

        {
          model: UserAccount,
          as: 'userAccount',

          attributes: [
            'user_account_id',
            'account_status'
          ],

          required: false,

          include: [
            {
              model: Role,
              as: 'roles',

              attributes: [
                'role_id',
                'role_code',
                'role_name'
              ],

              /*
               * Điều kiện nằm trên bảng trung gian
               * user_roles.
               */
              through: {

                attributes: [],

                where: {

                  start_date: {
                    [Op.lte]: today
                  },

                  [Op.or]: [
                    {
                      end_date: null
                    },
                    {
                      end_date: {
                        [Op.gte]: today
                      }
                    }
                  ]

                }
              },

              /*
               * Employee chưa có role
               * vẫn được trả ra.
               */
              required: false
            }
          ]
        }
      ],

      order: [
        [
          'emp_name',
          'ASC'
        ]
      ]
    });


  // ============================================
  // MAP SEQUELIZE MODEL -> FRONTEND DTO
  // ============================================

  const items =
    employees.map(employee => {

      /*
       * Theo business hiện tại,
       * một employee chỉ nên có
       * một team active tại một thời điểm.
       */
      const currentTeamHistory =
        employee.teamHistories?.[0];

      const currentTeam =
        currentTeamHistory?.team;


      return {

        id:
          Number(employee.emp_id),

        employeeCode:
          employee.emp_code,

        fullName:
          employee.emp_name,

        email:
          employee.emp_email,

        teamId:
          currentTeam
            ? Number(currentTeam.team_id)
            : null,

        teamName:
          currentTeam?.team_name ?? null,

        roles:
          employee.userAccount?.roles
            ?.map(role => ({
              id:
                Number(role.role_id),

              name:
                role.role_name
            }))
            ?? []

      };

    });


  return {
    ok: true,
    items
  };
}


module.exports = {
  getAllEmployees
};