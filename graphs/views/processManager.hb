{{#each processes}}

  <table class="table table-striped">
    <tr><th>pid</th><td>{{@key}}</td></tr>
    <tr><th>Identifier</th><td>{{this.identifier}}</td></tr>
    <tr><th>Title</th><td>{{this.title}}</td></tr>
    <tr><th>Input ports</th><td>{{this.inPorts}}</td></tr>
    <tr><th>Output ports</th><td>{{this.outPorts}}</td></tr>
    <tr><th>Output ports</th><td>{{this.outPorts}}</td></tr>
    <tr><th>Status</th><td>{{this.status}}</td></tr>
  </table>

{{/each}}
