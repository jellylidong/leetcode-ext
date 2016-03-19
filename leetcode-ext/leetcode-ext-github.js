/**
 * Created by binarylu on 3/18/16.
 */

var github_api = 'https://api.github.com';
var token = '';
var user = '';
var repo = '';

var postfix = {
    c: ".c",
    cpp: ".cpp",
    java: ".java",
    python: ".py",
    csharp: ".cs",
    javascript: ".js",
    ruby: ".rb",
    swift: ".swift",
    golang: ".go"
};

(function(){
    var reg = new RegExp('submissions');
    if (window.location.pathname.match(reg) != null)
        return false;
    chrome.storage.sync.get({
        token: '',
        user: '',
        repo_name: ''
    }, function(items) {
        token = items.token;
        user = items.user;
        repo = items.repo_name;
    });
    add_node();
    $("#readme_button").click(restore);
    $("#commit_readme").click(commit);
    $("#commit_question").click(commit);
    $("#button1").click(commit);
    $("#filename").val(get_filename());
    $('select[name=lang]').change(function() {
        var ext = get_extension();
        var filename = get_filename();
        filename = filename.substring(0, filename.lastIndexOf(".")) + ext;
        $("#filename").val(filename);
    });
})();

function add_node() {
    var $buttons = $("" +
        "<button type='button' class='btn btn-success' id='commit_question'>Add Question</button>&nbsp;&nbsp;" +
        "<button type='button' class='btn btn-success' data-toggle='modal' data-target='#readme' id='readme_button'>Add 'README.md'</button>" +
        "<span style='padding-left:10px;float:center' id='commit_status'></span>");
    var $div = $('' +
        '<div class="action">' +
            '<form class="form-inline">' +
                '<div style="width:100%" class="form-group">' +
                    '<table style="width:100%">' +
                        '<tr>' +
                            '<td style="width:70px">' +
                                '<label for="filename">Filename</label></td>' +
                            '<td style="width:200px">' +
                                '<input type="text" class="form-control" id="filename" placeholder="Filename"></td>' +
                            '<td style="width:75px">' +
                                '<label for="comments">Comment</label></td>' +
                            '<td>' +
                                '<input style="width:100%" type="text" class="form-control" id="code_message" placeholder="Input the comment for git commits"></td>' +
                        '</tr>' +
                    '</table>' +
                '</div>' +
            '</form>' +
        '</div>');
    var $modal =$('' +
        '<div class="modal fade" id="readme" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">' +
            '<div class="modal-dialog" role="document">' +
                '<div class="modal-content">' +
                    '<div class="modal-header">' +
                        '<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>' +
                        '<h4 class="modal-title" id="myModalLabel">README.md</h4>' +
                    '</div>' +
                    '<div class="modal-body">' +
                        'The following content will be commit to your Github repository.' +
                        '<textarea id="readme_content" class="form-control" rows="10"></textarea><br>' +
                        '<input id="readme_message" type="text" class="form-control" placeholder="Input comments for git commit">' +
                    '</div>' +
                    '<div class="modal-footer">' +
                        '<span style="float:left" id="readme_alert"></span>' +
                        '<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>' +
                        '<button type="button" class="btn btn-primary" id="commit_readme">Commit</button>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>');
    var $code = $("" +
        "<textarea id='code_content' style='display:none'></textarea>");

    $("code-button").after($buttons);
    $("div.action").before($div);
    $('body').append($modal).append($code);

    /* Only by this, the variable in original page can be got.
    * Even using jQuery like before can not get the variable in original page */
    var script = document.createElement("script");
    script.innerHTML = "get_code();" +
        "$('select[name=lang]').change(get_code);" +
        "function get_code() {" +
            "$('.editor').attr('id', 'ace_editor_id');" +
            "$('#code_content').val(ace.edit('ace_editor_id').getValue());" +
        "}";
    document.body.appendChild(script);

}

function commit() {
    var filename = "";
    if ($(this).attr("id") == "commit_readme") {
        filename = "README.md";
    } else if ($(this).attr("id") == "commit_question") {
        filename = "Question.md";
    } else {
        filename = get_filename();
    }
    filename = get_path() + "/" + filename;
    get_file(filename, update_file, update_file);
}

function restore() {
    var filename = "README.md";
    filename = get_path() + "/" + filename;
    get_file(filename, restore_file);
}

function get_file(filename, fsucc, ferr) {
    chrome.storage.sync.get({
        token: '',
        user: '',
        repo_name: ''
    }, function(items) {
        var token = items.token;
        var user = items.user;
        var repo = items.repo_name;
        $.ajax({
            url: github_api + '/repos/' + user  + '/' + repo + '/contents/' + filename,
            type: 'get',
            dataType: 'json',
            async: true,
            beforeSend: function(request) {
                request.setRequestHeader("Authorization", "token " + token);
            },
            success: function(jsonData) {
                if (typeof(jsonData)=='undefined' || !jsonData) jsonData = {};
                var sha = jsonData['sha'];
                var file_content = jsonData['content'];
                fsucc(filename, sha, file_content);
            },
            error: function(err) {
                if (err['status'] == 404) {
                    if(typeof ferr === "function") {
                        ferr(filename);
                    }
                } else {
                    set_status(filename.substr(path.length + 1), "err");
                }
            }
        });
    });
}

function restore_file(filename, sha, file_content) {
    if (filename == get_path() + "/README.md") {
        $("#readme_content").val(Base64.decode(file_content));
    }
}

function update_file(filename, sha) {
    var path = get_path();
    var content = "";
    var message = "";
    if (filename == path + "/README.md") {
        content = $("#readme_content").val();
        message = $("#readme_message").val();
        if (message == "") {
            message = "commited by leetcode-ext";
        }
    } else if (filename == path + "/Question.md") {
        content = "# " + $(".question-title:first").children(":first").html() + "\n\n";
        content += "[Original Page](" + window.location.href + ")\n\n"
        content += toMarkdown($(".question-content:first").html());
        message = "commit automatically by leetcode-ext";
    } else {
        content = $("#code_content").val();
        message = $("#code_message").val();
        if (message == "") {
            message = "commited by leetcode-ext";
        }
    }

    chrome.storage.sync.get({
        token: '',
        user: '',
        repo_name: ''
    }, function(items) {
        var token = items.token;
        var user = items.user;
        var repo = items.repo_name;
        $.ajax({
            url: github_api + '/repos/' + user  + '/' + repo + '/contents/' + filename,
            type: 'put',
            dataType: 'json',
            async: true,
            data: JSON.stringify({
                message: message,
                content: Base64.encode(content),
                sha: sha
            }),
            beforeSend: function(request) {
                request.setRequestHeader("Authorization", "token " + token);
            },
            success: function() {
                set_status(filename.substr(path.length + 1), "succ");
            },
            error: function() {
                set_status(filename.substr(path.length + 1), "err");
            }
        });
    });
}

function set_status(filename, status) {
    var $obj = filename == "README.md" ? $("#readme_alert") : $("#commit_status");
    if (status == "succ") {
        $obj.html("Success to commit " + filename);
        $obj.css("color", "green");
        setTimeout(function() {
            $obj.html("");
        }, 2000);
    } else {
        $obj.html("Fail to commit " + filename);
        $obj.css("color", "red");
    }
}

function get_path() {
    return $(".question-title:first").children(":first").html().replace(/ /g, "-").replace(/\./g, "");
}

function get_filename() {
    var filename;
    filename = $("#filename").val();
    if (filename == "") {
        var ext = get_extension();
        filename = "solution" + ext;
    }
    return filename;
}

function get_extension() {
    var ext = postfix[$("select[name=lang]").val()];
    if (!ext) {
        ext = ".code";
    }
    return ext;
}