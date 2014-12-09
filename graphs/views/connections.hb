{{#each connections}}

  <table>
    <tr><th>id</th><td>{{@key}}</td></tr>
    <tr><th>source</th><td>{{this.source.id}} {{this.source.port}}</td></tr>
    <tr><th>target</th><td>{{this.target.id}} {{this.target.port}}</td></tr>
    <tr><th>fills</th><td>{{this.fills}}</td></tr>
    <tr><th>rejects</th><td>{{this.rejects}}</td></tr>
    <tr><th>writes</th><td>{{this.writes}}</td></tr>
  </table>

{{/each}}
