/**
 * Created by katsanva on 02.10.2014.
 */

$(document).on('click', '.btn-login', function() {
    if (!$.cookie('access_token')) {
        return confirm('Ввійти через OpenID?');
    }

    $.removeCookie('access_token');
    $.removeCookie('nickname');
    $.removeCookie('account_id');

    window.location.reload();

    return false;
});

function renderAlert(level, text) {
    $('.view').append($('<div/>', {
        class: 'alert alert-' + level,
        html: text || 'На жаль не можна відобразити дані, спробуйте пізніше.'
    })).
        animate({
            width: 'toggle',
            height: 'toggle'
        });
}

$(document).ready(function() {
    if ($.cookie('access_token')) {
        $('.btn-login').html($.cookie('nickname') + ': Вийти').attr('href', '#');
        var progressBar = $('<div/>', {
            class: 'progress'
        }).append(
            $('<div/>', {
                class: 'progress-bar progress-bar-striped active',
                style: 'width:100%',
                role: 'progressbar',
                'aria-valuenow': 100,
                'aria-valuemin': 0,
                'aria-valuemax': 100
            })
        );

        $.ajax(
            {
                method: 'POST',
                timeout: 30000,
                beforeSend: function() {
                    $('.view').before(progressBar);
                },
                url: '/neighbours/',
                complete: function() {
                    progressBar.remove();
                },
                error: function(xhr, status) {
                    if (status === 'timeout') {
                        return renderAlert('danger', 'Упс, таймаут.');
                    }

                    var message = false;

                    try {
                        message = JSON.parse(xhr.responseText).message === 'RATINGS_NOT_FOUND' ?
                            'Дані рейтингу відсутні.' : false;
                    } catch (e) {
                        message = false;
                    }

                    renderAlert('danger', message);
                },
                success: function(data) {
                    if (!Object.keys(data.users).length) {
                        return renderAlert('warning', 'Немає даних для відображення.');
                    }

                    var head = $('<tr/>'),
                        table = $('<table/>', {class: 'table table-striped table-bordered'}).append(head);

                    head.append(
                        $('<th>', {html: 'Танк'}),
                        $('<th>', {html: 'Середній процент перемог'})
                    );

                    for (var k in data.users) {
                        if (!data.users.hasOwnProperty(k)) {
                            continue;
                        }

                        head.append($('<th>').append($('<a/>', {
                            rel: 'nofollow',
                            target: '_blank',
                            href: 'http://worldoftanks.ru/community/accounts/' + data.users[k].account_id,
                            html: data.users[k].account_id
                        })));
                    }

                    for (var i in data.tanks) {
                        if (!data.tanks.hasOwnProperty(i)) continue;
                        var tank = data.tanks[i],
                            sum = 0,
                            ownersAmount = 0,
                            row = $('<tr/>'),
                            tankHead = $('<th/>', {html: tank.localized_name});

                        row.append(tankHead);

                        for (var j in data.users) {
                            if (!data.users.hasOwnProperty(j)) {
                                continue;
                            }

                            var user = data.users[j],
                                td = $('<td>');

                            if (user.tanks[tank.tank_id]) {
                                var percentage = user.tanks[tank.tank_id].all.battles / user.battles_count.value * 100;

                                sum += user.tanks[tank.tank_id].all.battles > 0 ?
                                (user.tanks[tank.tank_id].all.wins / user.tanks[tank.tank_id].all.battles) * 100 :
                                    0;
                                ownersAmount += 1;
                                td.html(percentage.toFixed(1));
                            } else {
                                td.html('-');
                            }

                            td.appendTo(row);
                        }

                        tankHead.after($('<td/>', {html: (sum / ownersAmount).toFixed(1)}));
                        row.appendTo(table);
                    }


                    $('.view').html('').append(table).animate({
                        width: 'toggle',
                        height: 'toggle'
                    });
                }
            }
        );
    } else {
        renderAlert('warning', 'Необхідно увійти');
    }
});
