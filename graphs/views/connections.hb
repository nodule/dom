<table class="table table-striped">
  <thead>
    <tr>
      <th>Link</th>
      <th>Fills</th>
      <th>Rejects</th>
      <th>Writes</th>
    </tr>
  </thead>
  <tbody>
    {{#each connections}}
    <tr>
      <td>{{this.source.id}} {{this.source.port}} -> {{this.target.port}} {{this.target.id}}</td>
      <td class="success">fills: {{this.fills}}</td>
      <td class="danger">rejects: {{this.rejects}}</td>
      <td class="success">writes: {{this.writes}}</td>
    </tr>
    {{/each}}
  </tbody>
</table>
